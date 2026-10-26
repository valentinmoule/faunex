import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Captures named « Photo de la semaine » (small public table, cached app-wide). */
export function useContestWinnerCaptures() {
  return useQuery({
    queryKey: ['photo-contest-winner-captures'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const { data } = await supabase.from('photo_contest_winners').select('capture_id');
      return new Set((data ?? []).map((r) => r.capture_id).filter(Boolean) as string[]);
    },
  });
}

/** AI cutout URLs of winner captures, keyed by capture id (collector edition depth layer). */
export function useContestWinnerCutouts() {
  return useQuery({
    queryKey: ['photo-contest-winner-cutouts'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data } = await supabase.from('photo_contest_winners').select('capture_id, cutout_url');
      const map = new Map<string, string>();
      for (const r of data ?? []) {
        if (r.capture_id && (r as { cutout_url?: string | null }).cutout_url) {
          map.set(r.capture_id, (r as { cutout_url?: string | null }).cutout_url!);
        }
      }
      return map;
    },
  });
}

export interface BallotEntry {
  entry_id: string;
  capture_id: string;
  user_id: string;
  image_url: string;
  animal_name: string;
  scientific_name: string | null;
  rarity: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_mine: boolean;
  voted_for: boolean;
  vote_count: number;
}

export interface ContestWinner {
  week_start: string;
  capture_id: string;
  user_id: string;
  votes: number;
  image_url: string;
  animal_name: string;
  rarity: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/** Monday 00:00 of the current week in Paris time, as an ISO instant (approximate for client filtering). */
export function currentContestWeekStart(now = new Date()): Date {
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const offset = paris.getTime() - now.getTime();
  const day = (paris.getDay() + 6) % 7;
  const monday = new Date(paris);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day);
  return new Date(monday.getTime() - offset);
}

export const contestErrorKey = (message?: string) => {
  const known = ['already_voted', 'own_photo', 'voting_closed', 'already_submitted', 'not_this_week', 'not_approved', 'already_entered', 'not_owner'];
  const hit = known.find((k) => message?.includes(k));
  return `social.contest.errors.${hit ?? 'generic'}`;
};
