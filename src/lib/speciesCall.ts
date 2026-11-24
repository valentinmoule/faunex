// Animal calls (all taxa) from iNaturalist then GBIF (which aggregates
// xeno-canto, Tierstimmenarchiv, museums…). Free, no key, no AI.
// Only Creative Commons / public-domain sounds with a known author are used;
// the most open licence and lightest playable format win.
export interface SpeciesCall { url: string; attribution: string }

interface Candidate { url: string; author: string; license: string; format: string; attribution?: string }

const cache = new Map<string, Promise<SpeciesCall | null>>();

// Lower is better: CC0 / public domain, then BY, BY-SA, then non-commercial.
export function licenseRank(license: string): number {
  const l = license.toLowerCase().replace(/https?:\/\/creativecommons\.org\/(licenses|publicdomain)\//, '').replace(/[/_ ]+/g, '-');
  if (/cc0|zero|pdm|public-?domain|mark/.test(l)) return 0;
  if (/nd/.test(l)) return 99; // no-derivatives / unknown variants: still usable last
  if (/^cc-?by-?(\d|$)|^by-?(\d|$)/.test(l)) return 1;
  if (/^cc-?by-?sa|^by-?sa/.test(l)) return 2;
  if (/nc-?sa/.test(l)) return 4;
  if (/nc/.test(l)) return 3;
  return 99;
}
const formatRank = (f: string) => (/mp3|mpeg/i.test(f) ? 0 : /m4a|mp4|aac/i.test(f) ? 1 : /ogg|opus/i.test(f) ? 2 : 3);

export function pickBest(cands: Candidate[]): Candidate | null {
  const ok = cands.filter((c) => c.url.startsWith('https://') && c.author.trim() && licenseRank(c.license) < 99);
  const heavy = (c: Candidate) => (formatRank(`${c.format} ${c.url}`) === 3 ? 1 : 0); // WAV etc. last
  ok.sort((a, b) => heavy(a) - heavy(b) || licenseRank(a.license) - licenseRank(b.license) || formatRank(`${a.format} ${a.url}`) - formatRank(`${b.format} ${b.url}`));
  return ok[0] ?? null;
}

type INatSound = { file_url?: string; attribution?: string; license_code?: string; file_content_type?: string };
type INatObs = { sounds?: INatSound[]; user?: { name?: string; login?: string } };

async function inat(name: string, quality: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    taxon_name: name, sounds: 'true', quality_grade: quality,
    sound_license: 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa',
    order_by: 'votes', per_page: '30',
  });
  const r = await fetch(`https://api.inaturalist.org/v1/observations?${params}`);
  if (!r.ok) throw new Error('inat');
  const d = await r.json();
  return (d?.results ?? []).flatMap((o: INatObs) => (o.sounds ?? []).map((s) => ({
    url: s.file_url ?? '',
    author: o.user?.name || o.user?.login || s.attribution || '',
    license: s.license_code ?? '',
    format: s.file_content_type ?? '',
    attribution: s.attribution,
  })));
}

type GbifMedia = { type?: string; format?: string; identifier?: string; creator?: string; rightsHolder?: string; license?: string };
async function gbif(name: string): Promise<Candidate[]> {
  const params = new URLSearchParams({ scientificName: name, mediaType: 'Sound', limit: '50' });
  const r = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`);
  if (!r.ok) throw new Error('gbif');
  const d = await r.json();
  return (d?.results ?? []).flatMap((o: { media?: GbifMedia[]; recordedBy?: string; publisher?: string }) => (o.media ?? [])
    .filter((m) => m.type === 'Sound' || /^audio\//.test(m.format ?? ''))
    .map((m) => ({
      url: m.identifier ?? '',
      author: m.creator || m.rightsHolder || o.recordedBy || '',
      license: m.license ?? '',
      format: m.format ?? '',
    })));
}

const label = (c: Candidate) => (licenseRank(c.license) === 0 ? `${c.author} · CC0` : c.attribution || `© ${c.author}`);

export function fetchSpeciesCall(scientificName: string): Promise<SpeciesCall | null> {
  const name = scientificName.trim();
  const key = name.toLowerCase();
  if (!name) return Promise.resolve(null);
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      // Verified iNaturalist first, then the GBIF archives, then any iNaturalist observation.
      const steps = [() => inat(name, 'research'), () => gbif(name), () => inat(name, 'research,needs_id')];
      let failures = 0;
      for (const step of steps) {
        try {
          const best = pickBest(await step());
          if (best) return { url: best.url, attribution: label(best) };
        } catch { failures++; }
      }
      if (failures === steps.length) cache.delete(key); // offline: retry later
      return null;
    })());
  }
  return cache.get(key)!;
}
