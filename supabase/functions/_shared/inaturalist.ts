/**
 * Enrichissement des collections « territoire » via l'API publique iNaturalist.
 *
 * On récupère les espèces réellement les plus observées (observations validées,
 * « research grade ») sur le département, ce qui donne une faune crédible et
 * locale, là où une liste de mots-clés reste forcément approximative.
 *
 * API : https://api.inaturalist.org/v1/docs (gratuite, sans clé, CC-BY).
 */

const INAT = 'https://api.inaturalist.org/v1';
/** Identifiant iNaturalist de la France (racine des départements). */
const FRANCE_PLACE_ID = 6753;
/** Identifiants iNaturalist des territoires ultramarins (hors arbre « France »). */
const OVERSEAS_PLACE_QUERIES: Record<string, string> = {
  '971': 'Guadeloupe',
  '972': 'Martinique',
  '973': 'French Guiana',
  '974': 'Réunion',
  '976': 'Mayotte',
};

const fetchJson = async (url: string): Promise<any | null> => {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[inat] ${res.status} on ${url}: ${await res.text()}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('[inat] fetch failed', url, String(e));
    return null;
  }
};

/** Résout l'identifiant de lieu iNaturalist d'un département français. */
export const resolvePlaceId = async (code: string, departmentName: string): Promise<number | null> => {
  const query = OVERSEAS_PLACE_QUERIES[code] ?? departmentName;
  const data = await fetchJson(`${INAT}/places/autocomplete?q=${encodeURIComponent(query)}&per_page=20`);
  const results: any[] = data?.results ?? [];
  if (results.length === 0) return null;

  const isOverseas = code in OVERSEAS_PLACE_QUERIES;
  const match =
    results.find(
      (place) =>
        place.admin_level === 20 &&
        (isOverseas || place.ancestor_place_ids?.includes(FRANCE_PLACE_ID)),
    ) ??
    results.find((place) => [10, 20].includes(place.admin_level)) ??
    null;

  return match?.id ?? null;
};

/**
 * Noms scientifiques des espèces animales les plus observées sur un lieu,
 * classées par nombre d'observations décroissant.
 */
export const fetchTopObservedSpecies = async (placeId: number, perPage = 200): Promise<string[]> => {
  const data = await fetchJson(
    `${INAT}/observations/species_counts?place_id=${placeId}&taxon_id=1&quality_grade=research&rank=species&per_page=${perPage}`,
  );
  const results: any[] = data?.results ?? [];
  return results
    .map((entry) => entry?.taxon?.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
};

/** Classement des espèces réellement observées sur le département (vide si l'API échoue). */
export const observedSpeciesForDepartment = async (code: string, departmentName: string): Promise<string[]> => {
  const placeId = await resolvePlaceId(code, departmentName);
  if (!placeId) {
    console.warn(`[inat] no place found for ${code} (${departmentName})`);
    return [];
  }
  const species = await fetchTopObservedSpecies(placeId);
  console.log(`[inat] ${code} place=${placeId} observed species=${species.length}`);
  return species;
};
