import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { removeCatalogueEntry } from '@/lib/bestiaryCache';

export function useCatalogueModeration(userId: string | undefined, enabled: boolean) {
  const [allowedUser, setAllowedUser] = useState<string | null>(null);
  useEffect(() => {
    setAllowedUser(null);
    if (!userId || !enabled) return;
    let cancelled = false;
    void Promise.all([
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: userId, _role: 'moderator' }),
    ]).then((results) => {
      if (!cancelled && results.some((result) => !result.error && result.data === true)) setAllowedUser(userId);
    });
    return () => { cancelled = true; };
  }, [userId, enabled]);
  return { canDeleteSpecies: !!userId && allowedUser === userId };
}

export async function deleteBestiarySpecies(name: string, scientificName: string) {
  const { data, error } = await supabase.rpc('admin_delete_bestiary_species', {
    p_name: name, p_scientific: scientificName || null,
  });
  if (error) throw error;
  if (!data) throw new Error('Species no longer exists or identity changed');
  removeCatalogueEntry(name);
}