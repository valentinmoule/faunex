import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NaturalHistory {
  phylum: string | null;
  class_name: string | null;
  order_name: string | null;
  family: string | null;
  measurements: { size?: { value: string; kind: 'average' | 'range' }; weight?: { value: string; kind: 'average' | 'range' } };
  sources: { label: string; url: string }[];
}

export function useSpeciesNaturalHistory(name?: string, scientific?: string, enabled = false) {
  return useQuery({
    queryKey: ['species-natural-history', name, scientific],
    enabled: enabled && Boolean(name && scientific),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<NaturalHistory | null> => {
      const { data, error } = await supabase.functions.invoke('species-natural-history', {
        body: { name, scientific_name: scientific },
      });
      if (error) throw error;
      return data as NaturalHistory;
    },
  });
}