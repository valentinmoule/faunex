// Animal calls (all taxa) come from iNaturalist research-grade observations with a
// Creative Commons sound licence: free, no key, attribution displayed.
export interface SpeciesCall { url: string; attribution: string }

const cache = new Map<string, Promise<SpeciesCall | null>>();

export function fetchSpeciesCall(scientificName: string): Promise<SpeciesCall | null> {
  const key = scientificName.trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (!cache.has(key)) {
    const params = new URLSearchParams({
      taxon_name: scientificName.trim(),
      sounds: 'true',
      quality_grade: 'research',
      sound_license: 'cc-by,cc-by-sa,cc0,cc-by-nc,cc-by-nc-sa',
      order_by: 'votes',
      per_page: '10',
    });
    cache.set(key, fetch(`https://api.inaturalist.org/v1/observations?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const sounds = (d?.results ?? []).flatMap((o: { sounds?: { file_url?: string; attribution?: string }[] }) => o.sounds ?? [])
          .filter((s: { file_url?: string }) => s.file_url);
        // MP3 first: WAV is heavy and some mobile browsers refuse it.
        const best = sounds.find((s: { file_url: string }) => /\.mp3|\.m4a/i.test(s.file_url)) ?? sounds[0];
        return best ? { url: best.file_url, attribution: best.attribution ?? '' } : null;
      })
      .then((c) => c ?? fetchGbifCall(scientificName.trim()))
      .catch(() => { cache.delete(key); return null; }));
  }
  return cache.get(key)!;
}

// GBIF aggregates sound archives (xeno-canto, Tierstimmenarchiv, museums…): free, no key.
function fetchGbifCall(name: string): Promise<SpeciesCall | null> {
  const params = new URLSearchParams({ scientificName: name, mediaType: 'Sound', limit: '20' });
  return fetch(`https://api.gbif.org/v1/occurrence/search?${params}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      type M = { type?: string; format?: string; identifier?: string; creator?: string; rightsHolder?: string; license?: string; publisher?: string };
      const media: M[] = (d?.results ?? []).flatMap((o: { media?: M[] }) => o.media ?? [])
        .filter((m: M) => m.identifier?.startsWith('https://') && (m.type === 'Sound' || /^audio\//.test(m.format ?? '')));
      const best = media.find((m) => /mp3|mpeg|mp4|m4a/i.test(`${m.format} ${m.identifier}`)) ?? media[0];
      if (!best) return null;
      const who = best.creator || best.rightsHolder || best.publisher || '';
      return { url: best.identifier!, attribution: who ? `© ${who}` : '' };
    })
    .catch(() => null);
}

/** @deprecated calls are now offered for every animal group. */
export const isBirdCategory = (category?: string) => /oiseau|bird/i.test(category ?? '');
