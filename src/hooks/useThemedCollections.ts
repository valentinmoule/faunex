import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isThemeActive, type ThemedCollection } from '@/lib/themedCollections';

/** Themed collections created by admins. `all` also returns drafts (admin only via RLS). */
export function useThemedCollections(opts: { all?: boolean } = {}) {
  const [collections, setCollections] = useState<ThemedCollection[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('themed_collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) {
      const rows = data as unknown as ThemedCollection[];
      setCollections(opts.all ? rows : rows.filter((c) => c.event_kind !== 'advent' && isThemeActive(c)));
    }
    setLoaded(true);
  }, [opts.all]);

  useEffect(() => { void reload(); }, [reload]);

  return { collections, loaded, reload };
}
