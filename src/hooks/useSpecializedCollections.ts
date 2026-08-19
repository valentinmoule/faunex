import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CollectionProgress {
  collection_id: string;
  slug: string;
  title: string;
  kind: string;
  is_premium: boolean;
  icon: string | null;
  sort_order: number;
  total: number;
  owned: number;
}

export interface CollectionTaxon {
  id: string;
  vernacular_name: string;
  scientific_name: string | null;
  rarity: string;
  owned: boolean;
}

/**
 * Loads the rule-driven collections (main categories + specialized ones) with the
 * current user's progress. New collections created in the database appear here
 * automatically, no code change required.
 */
export const useSpecializedCollections = (userId: string | undefined) => {
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [ownedTaxa, setOwnedTaxa] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCollections([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [{ data: progress }, { data: captures }] = await Promise.all([
        supabase
          .from('my_collection_progress')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('captures')
          .select('taxon_id')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .not('taxon_id', 'is', null),
      ]);
      if (cancelled) return;
      setCollections(((progress ?? []) as CollectionProgress[]).filter((c) => c.total > 0));
      setOwnedTaxa(new Set(((captures ?? []) as { taxon_id: string }[]).map((c) => c.taxon_id)));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadCollectionTaxa = useCallback(
    async (collectionId: string): Promise<CollectionTaxon[]> => {
      const { data } = await supabase
        .from('collection_taxa')
        .select('taxon_id, taxa(id, vernacular_name, scientific_name, rarity)')
        .eq('collection_id', collectionId);

      return ((data ?? []) as any[])
        .map((row) => row.taxa)
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id,
          vernacular_name: t.vernacular_name,
          scientific_name: t.scientific_name,
          rarity: t.rarity,
          owned: ownedTaxa.has(t.id),
        }))
        .sort((a, b) => a.vernacular_name.localeCompare(b.vernacular_name, 'fr'));
    },
    [ownedTaxa]
  );

  return { collections, loading, loadCollectionTaxa };
};
