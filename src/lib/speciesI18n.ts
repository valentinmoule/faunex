/**
 * Localisation des espèces (noms communs + fiches).
 *
 * - Les noms communs anglais vivent dans `animals.name_en` : on charge une fois
 *   la table de correspondance FR -> EN et on la met en cache localStorage
 *   (le catalogue bouge très peu), puis on résout côté client.
 * - Les noms scientifiques ne sont jamais traduits.
 * - Les fiches détaillées sont traduites à la demande par l'edge function
 *   `translate-species-profile`, puis mises en cache en base.
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAll';

const KEY = 'faunex.speciesNames.en.v1';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

type Payload = { t: number; r: [string, string][] };

let cache: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;
const listeners = new Set<() => void>();

const normalize = (s: string) => s.trim().toLowerCase();

const readCache = (): { map: Map<string, string>; fresh: boolean } | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Payload;
    if (!p?.r?.length) return null;
    return { map: new Map(p.r), fresh: Date.now() - p.t < TTL };
  } catch {
    return null;
  }
};

const writeCache = (map: Map<string, string>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), r: [...map.entries()] } satisfies Payload));
  } catch {
    /* quota dépassé : on garde juste la version mémoire */
  }
};

const notify = () => listeners.forEach((fn) => fn());

const fetchMap = async (): Promise<Map<string, string>> => {
  const { data } = await fetchAllRows<{ name: string; name_en: string }>((from, to) =>
    supabase.rpc('species_names_en').order('name').range(from, to),
  );
  const map = new Map<string, string>();
  (data || []).forEach((row) => {
    if (row?.name && row?.name_en) map.set(normalize(row.name), row.name_en);
  });
  return map;
};

/** Charge (ou revalide) la table FR -> EN. Sûr à appeler plusieurs fois. */
export const loadSpeciesNames = (): Promise<Map<string, string>> => {
  if (inflight) return inflight;

  const cached = readCache();
  if (cached) {
    cache = cached.map;
    if (cached.fresh) return Promise.resolve(cached.map);
  }

  inflight = fetchMap()
    .then((map) => {
      if (map.size > 0) {
        cache = map;
        writeCache(map);
        notify();
      }
      return cache ?? map;
    })
    .catch(() => cache ?? new Map<string, string>())
    .finally(() => {
      inflight = null;
    });

  return inflight;
};

export const subscribeSpeciesNames = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Nom d'espèce affiché pour la locale demandée.
 * Repli systématique sur le nom français si la traduction n'existe pas encore.
 */
export const localizedSpeciesName = (frName: string | null | undefined, locale: string): string => {
  const base = frName || '';
  if (!base || !locale.toLowerCase().startsWith('en')) return base;
  if (!cache) {
    const cached = readCache();
    if (cached) cache = cached.map;
  }
  return cache?.get(normalize(base)) || base;
};

export interface LocalizedSpeciesFacts {
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;
  funFact?: string | null;
}

/**
 * Fiche d'espèce en anglais : lecture du cache serveur, puis traduction à la
 * demande (une seule fois par espèce, le résultat est stocké en base).
 */
export const fetchLocalizedSpeciesFacts = async (input: {
  name: string;
  scientificName?: string | null;
  description?: string | null;
  habitat?: string | null;
  diet?: string | null;
  funFact?: string | null;
}): Promise<LocalizedSpeciesFacts | null> => {
  const { name, scientificName } = input;
  if (!name) return null;

  const { data: cached } = await supabase.rpc('species_profile_en', {
    p_name: name,
    p_scientific: scientificName || null,
  });
  const hit = Array.isArray(cached) ? cached[0] : null;
  if (hit?.description_en) {
    return {
      description: hit.description_en,
      habitat: hit.habitat_en,
      diet: hit.diet_en,
      funFact: hit.fun_fact_en,
    };
  }

  const { data, error } = await supabase.functions.invoke('translate-species-profile', {
    body: {
      name,
      scientific_name: scientificName || undefined,
      description: input.description || undefined,
      habitat: input.habitat || undefined,
      diet: input.diet || undefined,
      fun_fact: input.funFact || undefined,
    },
  });
  if (error || !data || (data as any).error) return null;

  const res = data as Record<string, string | null>;
  return {
    description: res.description,
    habitat: res.habitat,
    diet: res.diet,
    funFact: res.fun_fact,
  };
};
