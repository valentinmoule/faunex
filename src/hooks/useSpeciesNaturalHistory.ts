import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NaturalHistory {
  phylum: string | null;
  class_name: string | null;
  order_name: string | null;
  family: string | null;
  measurements: { size?: { value: string; kind: 'average' | 'range' | 'estimate' }; weight?: { value: string; kind: 'average' | 'range' | 'estimate' } };
  sources: { label: string; url: string }[];
}

/**
 * Le catalogue garde des noms que la source ne peut pas résoudre : mentions
 * « Xysticus sp. », sous-espèces, hybrides. Ces recherches répondent 404 ou
 * 400 volontairement — la donnée n'existe pas pour cette fiche. Ce n'est pas
 * une panne : l'absente doit rester silencieuse, jamais remonter comme erreur
 * non rattrapée.
 */
const isExpectedAbsence = (error: unknown): boolean => {
  const status = (error as { context?: { status?: unknown } } | null | undefined)?.context?.status;
  return status === 404 || status === 400;
};

export function useSpeciesNaturalHistory(name?: string, scientific?: string, enabled = false) {
  return useQuery({
    queryKey: ['species-natural-history', name, scientific],
    enabled: enabled && Boolean(name && scientific),
    staleTime: 24 * 60 * 60 * 1000,
    // One retry for transient source failures; expected absences resolve to null.
    retry: 1,
    retryDelay: 400,
    throwOnError: false,
    queryFn: async (): Promise<NaturalHistory | null> => {
      const { data, error } = await supabase.functions.invoke('species-natural-history', {
        body: { name, scientific_name: scientific },
      });
      if (error) {
        if (isExpectedAbsence(error)) return null;
        throw error;
      }
      return data as NaturalHistory;
    },
  });
}
