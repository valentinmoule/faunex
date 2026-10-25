import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AdventCalendar, AdventSubmission } from '@/lib/advent';

export function useAdventCalendars() {
  const [collections, setCollections] = useState<AdventCalendar[]>([]);
  const [submissions, setSubmissions] = useState<AdventSubmission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_advent_calendars');
    if (!error && data) {
      const result = data as unknown as { now: string; collections: AdventCalendar[]; submissions: AdventSubmission[] };
      setCollections(result.collections); setSubmissions(result.submissions);
      setServerOffset(new Date(result.now).getTime() - Date.now());
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    void reload();
    const focus = () => { if (document.visibilityState === 'visible') void reload(); };
    document.addEventListener('visibilitychange', focus);
    const timer = window.setInterval(() => void reload(), 60000);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', focus); };
  }, [reload]);
  return { collections, submissions, loaded, now: new Date(Date.now() + serverOffset), reload };
}