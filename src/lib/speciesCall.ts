// Bird calls come from iNaturalist research-grade observations with a
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
      .catch(() => { cache.delete(key); return null; }));
  }
  return cache.get(key)!;
}

export const isBirdCategory = (category?: string) => /oiseau|bird/i.test(category ?? '');
