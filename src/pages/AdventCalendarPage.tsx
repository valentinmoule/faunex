import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Gift, Lock, Loader2, Snowflake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import BadgeRewardSheet from '@/components/BadgeRewardSheet';
import BadgeMedallion from '@/components/BadgeMedallion';
import { useAdventCalendars } from '@/hooks/useAdventCalendars';
import { adventState } from '@/lib/advent';
import cover from '@/assets/collections/advent-2026.jpg';

export default function AdventCalendarPage() {
  const { id } = useParams(); const navigate = useNavigate(); const { t, i18n } = useTranslation();
  const { collections, submissions, loaded, now, reload } = useAdventCalendars();
  const calendar = collections.find(c => c.id === id);
  const own = submissions.filter(s => s.collection_id === id);
  const [selected, setSelected] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false); const [reward, setReward] = useState(false); const [badgeClaimed, setBadgeClaimed] = useState(false);
  useEffect(() => { if (!id) return; void supabase.from('user_badges').select('badge_id').eq('badge_id', `advent_${id}`).then(({ data }) => setBadgeClaimed(Boolean(data?.length))); }, [id]);
  if (!loaded) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  if (!calendar) return <main className="p-6"><Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft />{t('bestiary.common.back')}</Button><p>{t('advent.notFound')}</p></main>;
  const count = new Set(own.filter(s => s.approved_at).map(s => s.day)).size;
  const challenge = calendar.calendar_days.find(d => d.day === selected);
  const state = challenge ? adventState(calendar.calendar_year, challenge.day, now, own) : null;
  const claim = async () => {
    if (!challenge || claiming) return; setClaiming(true);
    const { data, error } = await supabase.rpc('claim_advent_day', { p_collection: calendar.id, p_day: challenge.day });
    setClaiming(false);
    if (error || data === null) { toast.error(t('advent.error')); return; }
    toast.success(t('profile.reward.toast', { xp: data })); await reload();
  };
  const badge = { id: `advent_${calendar.id}`, name: t('advent.badge', { year: calendar.calendar_year }), description: t('advent.badgeDescription'), group: 'collections' as const, icon: '🎄', xp: calendar.final_badge_xp, total: 24 };
  return <main className="min-h-screen bg-background pb-28">
    <PageHeader sticky className="bg-background/90 px-5 pb-3 backdrop-blur-xl"><div className="mx-auto flex max-w-lg items-center gap-3"><Button variant="ghost" size="icon" aria-label={t('bestiary.common.back')} onClick={() => navigate(-1)}><ArrowLeft /></Button><span className="font-display text-sm font-bold">{t('advent.title')}</span>{!calendar.published && <span className="ml-auto text-xs text-muted-foreground">{t('advent.draft')}</span>}</div></PageHeader>
    <div className="mx-auto max-w-lg px-5">
      <div className="relative mt-2 h-52 overflow-hidden rounded-lg"><img src={calendar.cover_url || cover} width={1024} height={1536} alt="" className="h-full w-full object-cover object-center" /><div className="absolute inset-x-0 bottom-0 bg-background/90 px-4 py-3"><h1 className="font-display text-xl font-bold">{i18n.language.startsWith('en') ? calendar.title_en || calendar.title : calendar.title}</h1><p className="mt-1 text-xs text-muted-foreground">{t('advent.period', { year: calendar.calendar_year })}</p></div></div>
      <div className="flex items-center justify-between py-5"><p className="font-display text-sm font-semibold">{t('advent.progress', { count })}</p><Snowflake className="size-5 text-primary" /></div>
      <div className="grid grid-cols-4 gap-2">
        {calendar.calendar_days.map(d => { const s = adventState(calendar.calendar_year, d.day, now, own); const done = s === 'complete' || s === 'claimed'; return <Button key={d.day} variant="outline" aria-label={t('advent.day', { day: d.day })} onClick={() => setSelected(d.day)} className={`relative h-auto aspect-[4/5] min-w-0 flex-col gap-2 rounded-lg px-1 ${s === 'today' ? 'border-primary bg-primary/10' : done ? 'border-primary/40 bg-secondary' : 'bg-card'}`}><span className="font-display text-xl font-bold">{d.day}</span>{done ? <Check className="text-primary" /> : s === 'locked' ? <Lock className="text-muted-foreground/50" /> : s === 'pending' ? <Loader2 className="text-muted-foreground" /> : <Gift className={s === 'today' ? 'text-primary' : 'text-muted-foreground/50'} />}</Button>; })}
      </div>
      {challenge && <section className="border-b border-border py-6 text-center" aria-live="polite"><p className="text-xs font-semibold text-primary">{t('advent.day', { day: challenge.day })} · {t(`advent.${state}`, { day: challenge.day })}</p><h2 className="mt-2 font-display text-lg font-bold">{state === 'locked' ? t('advent.locked', { day: challenge.day }) : i18n.language.startsWith('en') ? challenge.title_en || challenge.title : challenge.title}</h2>{state === 'today' && <Button className="mt-4" onClick={() => navigate('/capture')}><Camera />{t('advent.capture')}</Button>}{state === 'complete' && <Button className="mt-4" disabled={claiming} onClick={claim}>{claiming ? <Loader2 className="animate-spin" /> : <Gift />}{t('advent.claim', { xp: challenge.xp })}</Button>}</section>}
      <section className="flex flex-col items-center py-8 text-center"><BadgeMedallion badgeId={badge.id} group="collections" state={badgeClaimed ? 'claimed' : count === 24 ? 'claimable' : 'locked'} size={120} /><h2 className="mt-3 font-display font-bold">{badge.name}</h2><p className="mt-1 text-xs text-muted-foreground">{t('advent.badgeDescription')}</p>{count === 24 && !badgeClaimed && <Button className="mt-4" onClick={() => setReward(true)}><Gift />{t('advent.claim', { xp: badge.xp })}</Button>}</section>
    </div>
    {reward && <BadgeRewardSheet entry={{ badge, progress: count, earned: count === 24, claimed: badgeClaimed }} onClose={() => setReward(false)} onClaimed={() => setBadgeClaimed(true)} />}
  </main>;
}