import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeagueSummary {
  week_start: string;
  tier: number;
  rank: number;
  points: number;
  group_size: number;
  prev_outcome: string | null;
  prev_tier: number | null;
  prev_rank: number | null;
}

export interface LeagueStanding {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  is_me: boolean;
}

/**
 * Charge le résumé de ligue de l'utilisateur (et, si demandé, le classement de son groupe).
 * `my_league` place automatiquement l'utilisateur dans un groupe pour la semaine en cours.
 */
export const useLeague = (withStandings = false) => {
  const { session } = useAuth();
  const [summary, setSummary] = useState<LeagueSummary | null>(null);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data: mine } = await supabase.rpc('my_league');
    const row = ((mine as LeagueSummary[] | null) || [])[0] || null;
    setSummary(
      row
        ? {
            ...row,
            tier: Number(row.tier),
            rank: Number(row.rank),
            points: Number(row.points),
            group_size: Number(row.group_size),
          }
        : null,
    );

    if (withStandings) {
      const { data } = await supabase.rpc('league_standings');
      setStandings(
        ((data as LeagueStanding[] | null) || []).map((r) => ({
          ...r,
          rank: Number(r.rank),
          points: Number(r.points),
        })),
      );
    }
    setLoading(false);
  }, [session, withStandings]);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    load();
  }, [session, load]);

  return { summary, standings, loading, reload: load };
};
