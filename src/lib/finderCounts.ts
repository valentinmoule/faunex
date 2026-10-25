import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';

/**
 * Compteurs de découvreurs par espèce, partagés entre écrans.
 * Une seule requête en vol, mémoire + localStorage pendant 5 minutes :
 * évite de retélécharger ~9 000 lignes à chaque ouverture du Bestiaire.
 */
const TTL = 5 * 60 * 1000;
const KEY = 'faunex:finder-counts:v1';
let memory: { at: number; rows: Array<{ animal_key: string; finders: number }> } | null = null;
let inflight: Promise<{ data: Array<{ animal_key: string; finders: number }> }> | null = null;

export function fetchFinderCounts(): Promise<{ data: Array<{ animal_key: string; finders: number }> }> {
  const now = Date.now();
  if (!memory) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) memory = JSON.parse(raw);
    } catch { /* stockage indisponible */ }
  }
  if (memory && now - memory.at < TTL) return Promise.resolve({ data: memory.rows });
  if (inflight) return inflight;
  inflight = fetchAllRows<any>((from, to) =>
    supabase.rpc('species_finder_counts').order('animal_key').range(from, to),
  ).then((res: any) => {
    inflight = null;
    const rows = (res.data || []) as Array<{ animal_key: string; finders: number }>;
    if (!res.error && rows.length) {
      memory = { at: Date.now(), rows };
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* quota */ }
    }
    return { data: rows.length ? rows : memory?.rows ?? [] };
  }, () => {
    inflight = null;
    return { data: memory?.rows ?? [] };
  });
  return inflight;
}
