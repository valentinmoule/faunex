import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LeagueTrophy from './LeagueTrophy';

const seenKey = (uid: string) => `faunex.league.recapSeen.${uid}`;

/** Écran de fin de semaine affiché à la place de la ligue, une fois par résultat de ligue réglé (mémorisé sur l'appareil). */
export default function LeagueWeekRecap({ userId, children }: { userId?: string; children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['league-last-result', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('league_results')
        .select('id, tier, next_tier, rank, points, outcome, week_start')
        .eq('user_id', userId!).order('week_start', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (data && userId && localStorage.getItem(seenKey(userId)) !== data.id) setOpen(true);
  }, [data, userId]);
  if (!open || !data || !userId) return <>{children}</>;

  const close = () => { localStorage.setItem(seenKey(userId), data.id); setOpen(false); };
  const outcome = data.outcome === 'promoted' || data.outcome === 'demoted' ? data.outcome : 'stayed';
  const tierName = (n: number) => t(`social.leaderboard.league.tiers.${n}`);
  const Icon = outcome === 'promoted' ? ArrowUp : outcome === 'demoted' ? ArrowDown : Minus;
  const tone = outcome === 'promoted' ? 'bg-primary/15 text-primary' : outcome === 'demoted' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground';

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-6 py-8 animate-in fade-in duration-300">
      <p className="text-[13px] font-display font-extrabold uppercase tracking-widest text-muted-foreground">{t('challenges.recap.kicker')}</p>
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <span aria-hidden className={`absolute h-56 w-56 rounded-full blur-2xl ${outcome === 'demoted' ? 'bg-muted' : 'bg-amber/25'}`} />
          <LeagueTrophy tier={data.next_tier} size={176} className={`relative ${outcome === 'promoted' ? 'animate-[bounce_1.2s_ease-out_1]' : ''}`} />
        </div>
        <span className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-display font-bold ${tone}`}>
          <Icon className="h-4 w-4" /> {t('challenges.recap.rank', { rank: data.rank, points: data.points })}
        </span>
        <h2 className="text-[28px] font-display font-extrabold leading-tight text-foreground">{t(`challenges.recap.${outcome}.title`)}</h2>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          {t(`challenges.recap.${outcome}.body`, { tier: tierName(data.next_tier), from: tierName(data.tier) })}
        </p>
      </div>
      <button onClick={close} className="game-button flex h-14 w-full max-w-sm items-center justify-center text-[16px]">
        {t('challenges.recap.continue')}
      </button>
    </section>
  );
}
