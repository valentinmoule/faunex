import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Flame, Hourglass } from 'lucide-react';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';

interface StandingRow {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  is_me: boolean;
}

interface MyLeague {
  week_start: string;
  tier: number;
  rank: number;
  points: number;
  group_size: number;
  prev_outcome: string | null;
  prev_tier: number | null;
  prev_rank: number | null;
}

/** Mirrors public.league_tiers (kept in sync with seed data). */
const TIERS = [
  { label: 'Débutant', emoji: '🌱' },
  { label: 'Bronze', emoji: '🥉' },
  { label: 'Argent', emoji: '🥈' },
  { label: 'Or', emoji: '🥇' },
  { label: 'Platine', emoji: '💎' },
  { label: 'Diamant', emoji: '💠' },
  { label: 'Élite', emoji: '👑' },
];

const tierInfo = (tier: number) => TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];

/** Milliseconds until next Monday 00:00 (leagues run Monday → Monday, like date_trunc('week')). */
const msUntilReset = () => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - day), 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
};

const formatTimeLeft = (ms: number, t: (key: string, opts?: any) => string) => {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t('social.leaderboard.timeLeftDays', { days, hours });
  if (hours > 0) return t('social.leaderboard.timeLeftHours', { hours, minutes });
  return t('social.leaderboard.timeLeftMinutes', { minutes });
};

const WeeklyLeague = () => {
  const { t } = useTranslation();
  const [mine, setMine] = useState<MyLeague | null>(null);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [ready, setReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(msUntilReset);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const load = async () => {
      const [me, top] = await Promise.all([
        supabase.rpc('my_league' as never),
        supabase.rpc('league_standings' as never),
      ]);
      if (cancelled) return;
      const m = ((me.data as unknown as MyLeague[] | null) || [])[0];
      if (m) {
        setMine({
          ...m,
          tier: Number(m.tier),
          rank: Number(m.rank),
          points: Number(m.points),
          group_size: Number(m.group_size),
        });
        setRows(((top.data as unknown as StandingRow[] | null) || []).map(r => ({
          ...r,
          rank: Number(r.rank),
          points: Number(r.points),
        })));
      }
      setReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const userIds = useMemo(() => rows.map(r => r.user_id), [rows]);
  const premiumIds = usePremiumUsers(userIds);

  if (!ready) {
    return <p className="px-5 py-10 text-center text-[13px] font-display text-muted-foreground">{t('social.common.loading')}</p>;
  }

  if (!mine) {
    return (
      <div className="px-5 py-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center mb-3">
          <Flame className="w-6 h-6 text-primary" />
        </div>
        <p className="text-[14px] font-display font-bold text-foreground">{t('social.league.emptyTitle')}</p>
        <p className="mt-1 text-[12px] font-display text-muted-foreground leading-relaxed">{t('social.league.emptyDesc')}</p>
      </div>
    );
  }

  const tier = tierInfo(mine.tier);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3 ping];
  return null;
};

export default WeeklyLeague;
