import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Crown, Lock, Flame, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import { thumbUrl } from '@/lib/imageUrl';
import { computeJournalStats, RARITY_RANK, type JournalCapture } from '@/lib/fieldJournal';

const RARITY_VARS: Record<string, string> = {
  common: 'hsl(220 9% 60%)', uncommon: 'hsl(152 62% 36%)', rare: 'hsl(210 92% 50%)', very_rare: 'hsl(265 72% 55%)',
  ultra_rare: 'hsl(220 18% 62%)', illustration_rare: 'hsl(43 95% 52%)', special_rare: 'hsl(33 96% 50%)', hyper_rare: 'hsl(24 98% 50%)',
};

/** Données d'exemple floutées pour les comptes gratuits sans captures. */
const SAMPLE: JournalCapture[] = Array.from({ length: 48 }, (_, i) => ({
  animal_name: ['Rouge-gorge familier', 'Mésange bleue', 'Écureuil roux', 'Lézard des murailles', 'Paon-du-jour', 'Héron cendré'][i % 6] + (i > 5 ? ` ${i}` : ''),
  category: ['Oiseaux', 'Oiseaux', 'Mammifères', 'Reptiles', 'Insectes', 'Oiseaux'][i % 6],
  rarity: RARITY_RANK[i % 4],
  location: ['Bois de Vincennes', 'Parc de Sceaux', 'Forêt de Fontainebleau'][i % 3],
  created_at: new Date(Date.now() - (i * 3 + (i % 2)) * 86_400_000).toISOString(),
}));

const Delta = ({ now, before }: { now: number; before: number }) => {
  if (now === before) return null;
  const up = now > before;
  const Icon = up ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-0.5 text-[11px] font-display font-bold ${up ? 'text-primary' : 'text-muted-foreground'}`}><Icon className="h-3 w-3" />{up ? '+' : ''}{now - before}</span>;
};

const FieldJournalPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const uid = session?.user?.id;
  const { isPremium, loading: premiumLoading } = useSubscription(uid);
  const { speciesName } = useSpeciesName();

  const q = useQuery({
    queryKey: ['field-journal', uid],
    enabled: !!uid,
    queryFn: async () => {
      const rows: JournalCapture[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('captures')
          .select('animal_name, category, rarity, location, created_at, image_url')
          .eq('user_id', uid!).eq('status', 'approved').range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as JournalCapture[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });

  const locked = !premiumLoading && !isPremium;
  const rows = locked && (q.data?.length ?? 0) === 0 ? SAMPLE : (q.data ?? []);
  const s = useMemo(() => computeJournalStats(rows), [rows]);
  const lang = i18n.language;
  const fmtMonth = (k: string, opts: Intl.DateTimeFormatOptions = { month: 'long' }) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(lang, opts); };
  const fmtDay = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }); };
  const heatMax = Math.max(1, ...s.heat.map((h) => h.count));
  const monthMax = Math.max(1, ...s.months.map((m) => m.captures));
  const weeks = useMemo(() => { const w: typeof s.heat[] = []; for (let i = 0; i < s.heat.length; i += 7) w.push(s.heat.slice(i, i + 7)); return w; }, [s.heat]);
  const rarityTotal = Object.values(s.rarities).reduce((a, b) => a + b, 0) || 1;
  const catTotal = s.categories.reduce((a, c) => a + c.count, 0) || 1;

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
        <div className="relative mx-auto max-w-lg space-y-5 px-4 pt-5">
          {locked && (
            <section className="relative overflow-hidden rounded-3xl bg-card p-5 shadow-card">
              <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-amber/30 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 text-foreground"><Lock className="h-5 w-5" /></span>
                <p className="mt-4 font-display text-2xl font-black leading-tight">{t('premiumFeatures.journal.lockedTitle')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('premiumFeatures.journal.lockedBody')}</p>
                <Button onClick={() => navigate('/premium')} className="game-button mt-4 h-12 w-full font-display"><Crown className="h-4 w-4" />{t('premiumFeatures.journal.cta')}</Button>
              </div>
            </section>
          )}
          {/* Héros : totaux à vie */}
          <section className={`mission-plate rounded-3xl p-5 ${locked && rows === SAMPLE ? 'pointer-events-none select-none blur-[5px]' : ''}`}>
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.14em] text-primary">{t('premiumFeatures.journal.lifetime')}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="font-display text-5xl font-black leading-none tabular-nums text-foreground">{s.species}</p>
              <p className="pb-1 font-display text-sm font-bold text-muted-foreground">{t('premiumFeatures.journal.speciesFound', { count: s.species })}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border/60">
              {[['captures', s.total], ['places', s.places], ['activeDays', s.activeDays]].map(([k, v]) => (
                <div key={k as string} className="px-2 first:pl-0">
                  <p className="font-display text-xl font-black tabular-nums text-foreground">{v}</p>
                  <p className="text-[11px] font-display font-bold leading-tight text-muted-foreground">{t(`premiumFeatures.journal.${k}`)}</p>
                </div>
              ))}
            </div>
          </section>

          <div className={locked ? 'pointer-events-none select-none blur-[5px] opacity-80' : ''} aria-hidden={locked}>
            {/* Ce mois-ci */}
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-bold capitalize">{fmtMonth(s.thisMonth.key, { month: 'long', year: 'numeric' })}</h2>
                <span className="text-[11px] text-muted-foreground">{t('premiumFeatures.journal.vsLast', { month: fmtMonth(s.lastMonth.key) })}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([['captures', s.thisMonth.captures, s.lastMonth.captures], ['newSpecies', s.thisMonth.newSpecies, s.lastMonth.newSpecies], ['outings', s.thisMonth.days, s.lastMonth.days]] as const).map(([k, v, b]) => (
                  <div key={k} className="mission-plate rounded-2xl p-3">
                    <p className="font-display text-2xl font-black tabular-nums">{v}</p>
                    <p className="text-[11px] font-display font-bold leading-tight text-muted-foreground">{t(`premiumFeatures.journal.${k}`)}</p>
                    <Delta now={v} before={b} />
                  </div>
                ))}
              </div>
              {/* 6 derniers mois */}
              <div className="mission-plate mt-2 rounded-3xl p-4">
                <div className="flex h-28 items-end gap-2">
                  {s.months.map((m, i) => (
                    <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-display font-black tabular-nums text-muted-foreground">{m.captures || ''}</span>
                      <div className="relative w-full overflow-hidden rounded-lg bg-muted" style={{ height: `${Math.max(6, (m.captures / monthMax) * 84)}px` }}>
                        <div className={`absolute inset-0 ${i === 5 ? 'bg-primary' : 'bg-primary/35'}`} />
                        {m.newSpecies > 0 && <div className="absolute inset-x-0 bottom-0 bg-amber" style={{ height: `${(m.newSpecies / Math.max(1, m.captures)) * 100}%` }} />}
                      </div>
                      <span className="text-[10px] font-display font-bold capitalize text-muted-foreground">{fmtMonth(m.key, { month: 'short' }).replace('.', '')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" />{t('premiumFeatures.journal.captures')}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber" />{t('premiumFeatures.journal.newSpecies')}</span>
                </div>
              </div>
            </section>

            {/* Records */}
            <section className="mt-6 space-y-2">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.records')}</h2>
              {s.rarest && (
                <div className="mission-plate flex items-center gap-3 rounded-3xl p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-muted" style={{ borderColor: RARITY_VARS[s.rarest.rarity ?? 'common'] }}>
                    {s.rarest.image_url && <img src={thumbUrl(s.rarest.image_url, 160, 72)} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-display font-bold uppercase tracking-wide text-amber">{t('premiumFeatures.journal.rarest')}</p>
                    <p className="truncate font-display text-[16px] font-bold">{speciesName(s.rarest.animal_name)}</p>
                    <RarityBadge rarity={s.rarest.rarity ?? 'common'} plain />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="mission-plate rounded-2xl p-3">
                  <p className="flex items-center gap-1 text-[11px] font-display font-bold text-muted-foreground"><Flame className="h-3.5 w-3.5 text-amber" />{t('premiumFeatures.journal.currentStreak')}</p>
                  <p className="font-display text-xl font-black">{t('premiumFeatures.journal.streakDays', { count: s.currentStreak })}</p>
                  <p className="text-[11px] text-muted-foreground">{t('premiumFeatures.journal.recordStreak', { count: s.longestStreak })}</p>
                </div>
                <div className="mission-plate rounded-2xl p-3">
                  <p className="text-[11px] font-display font-bold text-muted-foreground">{t('premiumFeatures.journal.bestDay')}</p>
                  <p className="font-display text-xl font-black">{t('premiumFeatures.journal.speciesN', { count: s.bestDay?.species ?? 0 })}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.bestDay ? fmtDay(s.bestDay.date) : '—'}</p>
                </div>
              </div>
            </section>

            {/* Heatmap 26 semaines */}
            <section className="mt-6 space-y-2">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.activity')}</h2>
              <div className="mission-plate rounded-3xl p-4">
                <div className="flex gap-[3px]">
                  {weeks.map((w, wi) => (
                    <div key={wi} className="flex flex-1 flex-col gap-[3px]">
                      {w.map((h) => (
                        <span key={h.date} title={`${h.date} · ${h.count}`} className={`aspect-square rounded-[3px] ${h.count === 0 ? 'bg-muted' : 'bg-primary'}`} style={h.count ? { opacity: 0.3 + 0.7 * (h.count / heatMax) } : undefined} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  {t('premiumFeatures.journal.less')}
                  {[0, 0.35, 0.6, 1].map((o) => <span key={o} className={`h-2.5 w-2.5 rounded-[3px] ${o ? 'bg-primary' : 'bg-muted'}`} style={o ? { opacity: o } : undefined} />)}
                  {t('premiumFeatures.journal.more')}
                </div>
              </div>
            </section>

            {/* Biodiversité par catégorie */}
            <section className="mt-6 space-y-3">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.byCategory')}</h2>
              {s.categories.map((c) => { const Icon = categoryLineIcon(c.key); const pct = Math.round((c.count / catTotal) * 100); return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between"><span className="truncate text-sm font-display font-bold">{c.key}</span><span className="text-xs font-display font-black tabular-nums">{c.count} <span className="font-bold text-muted-foreground">· {pct}%</span></span></div>
                    <div className="mission-gauge mt-1 h-2 overflow-hidden rounded-full"><div className="mission-gauge-fill h-full rounded-full" style={{ width: `${(c.count / s.categories[0].count) * 100}%` }} /></div>
                  </div>
                </div>
              ); })}
            </section>

            {/* Rareté : barre empilée */}
            <section className="mt-6 space-y-3">
              <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.byRarity')}</h2>
              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                {RARITY_RANK.filter((r) => s.rarities[r]).map((r) => <span key={r} style={{ width: `${(s.rarities[r] / rarityTotal) * 100}%`, background: RARITY_VARS[r] }} />)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {RARITY_RANK.filter((r) => s.rarities[r]).map((r) => (
                  <div key={r} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RARITY_VARS[r] }} /><RarityBadge rarity={r} plain showLabel /></span>
                    <span className="text-sm font-display font-black tabular-nums">{s.rarities[r]}</span>
                  </div>
                ))}
              </div>
            </section>

            {s.topPlaces.length > 0 && (
              <section className="mt-6 space-y-2">
                <h2 className="font-display text-lg font-bold">{t('premiumFeatures.journal.topPlaces')}</h2>
                <div className="divide-y divide-border/60">
                  {s.topPlaces.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 font-display text-sm font-black text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-display font-bold">{p.key}</span>
                      <span className="text-right"><span className="block text-sm font-display font-black tabular-nums">{t('premiumFeatures.journal.speciesN', { count: p.count })}</span><span className="block text-[10.5px] text-muted-foreground">{t('premiumFeatures.journal.capturesN', { count: p.captures })}</span></span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default FieldJournalPage;
