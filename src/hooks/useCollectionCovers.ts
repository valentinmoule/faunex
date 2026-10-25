import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Personal covers never replace shared catalogue artwork. */
export function useCollectionCovers(userId?: string) {
  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    setCovers({});
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('user_collection_covers')
        .select('collection_key, capture_id').eq('user_id', userId);
      if (!cancelled) setCovers(Object.fromEntries((data || []).map(row => [row.collection_key, row.capture_id])));
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  const setCover = useCallback(async (key: string, captureId: string | null) => {
    if (!userId) return false;
    const { error } = captureId
      ? await supabase.from('user_collection_covers').upsert({ user_id: userId, collection_key: key, capture_id: captureId }, { onConflict: 'user_id,collection_key' })
      : await supabase.from('user_collection_covers').delete().eq('user_id', userId).eq('collection_key', key);
    if (error) return false;
    setCovers(prev => {
      const next = { ...prev };
      if (captureId) next[key] = captureId;
      else delete next[key];
      return next;
    });
    return true;
  }, [userId]);
  return { covers, setCover };
}