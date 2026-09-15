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
  const rest = rows.slice(3);

  return (
    <div className="pb-2">
      {/* League header */}
      <div className="mx-4 mt-1 rounded-3xl bg-gradient-to-b from-primary/10 via-card to-card border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl shadow-sm">
              {tier.emoji}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">
                {t('social.league.myLeague')}
              </p>
              <p className="text-[15px] font-display font-bold text-foreground truncate">{tier.label}</p>
              <p className="text-[11px] font-display text-muted-foreground">
                {t('social.league.myRank', { rank: mine.rank, total: mine.group_size })} · {t('social.league.myPoints', { count: mine.points })}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1">
            <Hourglass className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-display font-bold text-muted-foreground text-center leading-tight">
              {formatTimeLeft(timeLeft, t)}
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] font-display text-muted-foreground">{t('social.league.emptyGroup')}</p>
      ) : (
        <>
          {/* Podium */}
          <div className="mx-4 mt-3 mb-4 rounded-3xl bg-gradient-to-b from-primary/10 via-card to-card border border-border p-4">
            <div className="flex items-end justify-center gap-3">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((r) => {
                const isFirst = r === podium[0];
                const cfg = isFirst
                  ? { ring: 'ring-amber/50', badge: 'bg-amber text-amber-dark', avatar: 'lg' as const }
                  : { ring: r.rank === 2 ? 'ring-muted-foreground/30' : 'ring-earth/40', badge: r.rank === 2 ? 'bg-muted text-foreground' : 'bg-earth text-primary-foreground', avatar: 'md' as const };
                return (
                  <div key={r.user_id} className="flex-1 flex flex-col items-center gap-1.5 max-w-[33%]">
                    {isFirst && <Crown className="w-5 h-5 text-amber" />}
                    <div className="relative">
                      <PremiumAvatar
                        avatarUrl={r.avatar_url}
                        name={r.display_name || r.username || '?'}
                        isPremium={premiumIds.has(r.user_id)}
                        size={cfg.avatar}
                        className={`ring-4 ${cfg.ring}`}
                      />
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${cfg.badge} flex items-center justify-center text-[10px] font-display font-bold shadow-sm`}>
                        {r.rank}
                      </span>
                    </div>
                    <p className={`text-[11px] font-display font-bold truncate max-w-full ${r.is_me ? 'text-primary' : 'text-foreground'}`}>
                      {r.is_me ? t('social.leaderboard.you') : r.display_name || r.username || t('social.leaderboard.defaultName')}
                    </p>
                    <p className="text-[10px] font-display text-muted-foreground">{t('social.league.myPoints', { count: r.points })}</p>
                    <div className={`w-full ${isFirst ? 'h-16' : r.rank === 2 ? 'h-11' : 'h-8'} rounded-t-xl bg-gradient-to-t from-primary/15 to-primary/40 border-x border-t border-border`} />
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="divide-y divide-border">
            {rest.map((r) => (
              <li key={r.user_id} className={`flex items-center gap-3 px-5 py-2.5 ${r.is_me ? 'bg-primary/5' : ''}`}>
                <span className={`w-6 text-center text-[13px] font-display font-bold ${r.is_me ? 'text-primary' : 'text-muted-foreground'}`}>
                  {r.rank}
                </span>
                <PremiumAvatar
                  avatarUrl={r.avatar_url}
                  name={r.display_name || r.username || '?'}
                  isPremium={premiumIds.has(r.user_id)}
                  size="md"
                />
                <p className={`flex-1 min-w-0 truncate text-[13px] font-display ${r.is_me ? 'font-bold text-primary' : 'text-foreground'}`}>
                  {r.is_me ? t('social.leaderboard.you') : r.display_name || r.username || t('social.leaderboard.defaultName')}
                </p>
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{r.points}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default WeeklyLeague;
