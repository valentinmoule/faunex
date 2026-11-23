import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { findSpeciesNumber } from '@/lib/bestiaryCache';

/**
 * Numéro d'espèce de la fiche du Bestiaire, pour la pastille des cartes.
 *
 * Le catalogue local (cache) répond en premier. S'il est absent ou périmé —
 * c'est le cas quand on arrive directement sur la capture sans avoir ouvert le
 * Bestiaire — on relit la fiche exacte côté serveur : nom commun d'abord, nom
 * scientifique seulement s'il désigne une seule tuile, car les races domestiques
 * partagent un binôme.
 */
export function useSpeciesNumber(name?: string | null, scientificName?: string | null): number | null {
  const [number, setNumber] = useState<number | null>(null);

  useEffect(() => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setNumber(null);
      return;
    }

    const cached = findSpeciesNumber(trimmed);
    if (cached) {
      setNumber(cached);
      return;
    }

    let cancelled = false;
    const lookup = async () => {
      const byName = await supabase
        .from('animals')
        .select('species_number')
        .eq('name', trimmed)
        .limit(1);
      const row = (byName.data || [])[0] as { species_number?: number | null } | undefined;
      if (typeof row?.species_number === 'number') {
        if (!cancelled) setNumber(row.species_number);
        return;
      }

      const sci = (scientificName || '').trim().toLowerCase();
      if (!sci) {
        if (!cancelled) setNumber(null);
        return;
      }
      const bySci = await supabase
        .from('animals')
        .select('species_number, name')
        .ilike('scientific_name', sci)
        .limit(2);
      const rows = (bySci.data || []) as { species_number?: number | null }[];
      if (!cancelled) setNumber(rows.length === 1 ? rows[0].species_number ?? null : null);
    };

    void lookup();
    return () => {
      cancelled = true;
    };
  }, [name, scientificName]);

  return number;
}
