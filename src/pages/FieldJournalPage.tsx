import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { computeJournalStats, type JournalCapture } from '@/lib/fieldJournal';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'very_rare', 'ultra_rare', 'illustration_rare', 'special_rare', 'hyper_rare'];

const FieldJournalPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const uid = session?.user?.id;
  const { isPremium, loading: premiumLoading } = useSubscription(uid);

  const q = useQuery({
    queryKey: ['field-journal', uid],
    enabled: !!uid,
    queryFn: async () => {
      const rows: JournalCapture[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('captures')
          .select('animal_name, category, rarity, location, created_at')
          .eq('user_id', uid!).eq('status', 'approved').range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as JournalCapture[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });

  const s = useMemo(() => computeJournalStats(q.data ?? []), [q.data]);
  const locked = !premiumLoading && !isPremium;
  const fmtMonth = (k: string) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }); };
  const max = Math.max(1, ...s.heat.map((h) => h.count));

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      <PageHeader sticky className="border-b border-border bg-background px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="truncate font-display text-2xl font-bold">{t('premiumFeatures.journal.title')}</h1>
        </div>
      </PageHeader>
      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : s.total === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">{t('premiumFeatures.journal.empty')}</p>
      ) : (
        <div className="relative mx-auto max-w-lg space-y-6 px-4 pt-4">
          <p className="text-sm text-muted-foreground">{t('premiumFeatures.journal.subtitle')}</p>
          <div className="grid grid-cols-2 gap-3">
            {[['captures', s.total], ['species', s.species], ['places', s.places], ['activeDays', s.activeDays]].map(([k, v]) => (
              <div key={k as string} className="mission-plate rounded-3xl p-4">
                <p className="font-display text-3xl font-black tabular-nums text-foreground">{v}</p>
                <p className="text-xs font-display font-bold text-muted-foreground">{t(`premiumFeatures.journal.${k}`)}</p>
              </div>
            ))}
          </div>

          <div className={locked ? 'pointer-events-none select-none blur-[6px]' : ''} aria-hidden={locked}>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.activity')}</h2>
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {s.heat.map((h) => (
                  <span key={h.date} title={`${h.date} · ${h.count}`} className="aspect-square rounded-[4px] bg-primary" style={{ opacity: h.count === 0 ? 0.08 : 0.25 + 0.75 * (h.count / max) }} />
                ))}
              </div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-3">
              <div className="mission-plate rounded-3xl p-4">
                <p className="text-xs font-display font-bold text-muted-foreground">{t('premiumFeatures.journal.streak')}</p>
                <p className="font-display text-xl font-black">{t('premiumFeatures.journal.streakDays', { count: s.longestStreak })}</p>
              </div>
              <div className="mission-plate rounded-3xl p-4">
                <p className="text-xs font-display font-bold text-muted-foreground">{t('premiumFeatures.journal.bestMonth')}</p>
                <p className="font-display text-xl font-black capitalize">{s.bestMonth ? fmtMonth(s.bestMonth.key) : '—'}</p>
              </div>
            </section>

            <section className="mt-6 space-y-3">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.byCategory')}</h2>
              {s.categories.map((c) => { const Icon = categoryLineIcon(c.key); return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                  <span className="w-28 truncate text-sm font-display font-bold">{c.key}</span>
                  <div className="mission-gauge h-2.5 flex-1 overflow-hidden rounded-full"><div className="mission-gauge-fill h-full rounded-full" style={{ width: `${(c.count / s.categories[0].count) * 100}%` }} /></div>
                  <span className="w-8 text-right text-xs font-display font-black tabular-nums">{c.count}</span>
                </div>
              ); })}
            </section>

            <section className="mt-6 space-y-3">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.byRarity')}</h2>
              {RARITY_ORDER.filter((r) => s.rarities[r]).map((r) => (
                <div key={r} className="flex items-center justify-between">
                  <RarityBadge rarity={r} plain showLabel />
                  <span className="text-sm font-display font-black tabular-nums">{s.rarities[r]}</span>
                </div>
              ))}
            </section>

            {s.topPlaces.length > 0 && (
              <section className="mt-6 space-y-2">
                <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.topPlaces')}</h2>
                <div className="divide-y divide-border/60">
                  {s.topPlaces.map((p) => (
                    <div key={p.key} className="flex items-center justify-between py-2.5">
                      <span className="truncate text-sm">{p.key}</span>
                      <span className="text-sm font-display font-black tabular-nums">{p.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {locked && (
            <div className="absolute inset-x-4 top-[260px] rounded-3xl bg-card p-5 text-center shadow-card">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber"><Crown className="h-6 w-6" /></span>
              <p className="mt-3 font-display text-lg font-bold">{t('premiumFeatures.journal.lockedTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('premiumFeatures.journal.lockedBody')}</p>
              <Button onClick={() => navigate('/premium')} className="game-button mt-4 h-12 w-full font-display">{t('premiumFeatures.journal.cta')}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldJournalPage;
