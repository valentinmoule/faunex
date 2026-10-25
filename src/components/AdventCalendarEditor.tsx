import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { defaultAdventDays, ADVENT_CATEGORIES, type AdventChallenge } from '@/lib/advent';
import type { ThemedCollection } from '@/lib/themedCollections';
import type { Json } from '@/integrations/supabase/types';
import { dataUrlToBytes, prepareSourceFile, resizeDataUrl } from '@/lib/imageProcessing';
import cover from '@/assets/collections/advent-2026.jpg';

export default function AdventCalendarEditor({ initial, onClose }: { initial?: ThemedCollection; onClose: () => void }) {
  const { t } = useTranslation(); const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title || 'Le Calendrier de l’Avent des Explorateurs');
  const [titleEn, setTitleEn] = useState(initial?.title_en || 'The Explorers’ Advent Calendar');
  const [year, setYear] = useState(initial?.calendar_year || 2026);
  const [days, setDays] = useState<AdventChallenge[]>(initial?.calendar_days?.length ? initial.calendar_days : defaultAdventDays());
  const [finalXp, setFinalXp] = useState(initial?.final_badge_xp ?? 300);
  const [published, setPublished] = useState(initial?.published || false);
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const setDay = (day: number, patch: Partial<AdventChallenge>) => setDays(prev => prev.map(d => d.day === day ? { ...d, ...patch } : d));
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error();
      const source = await prepareSourceFile(file); if (!source) throw new Error();
      const bytes = dataUrlToBytes(await resizeDataUrl(source, 1200, .82));
      const path = `${user.id}/collections/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from('captures').upload(path, new Blob([bytes as BlobPart], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
      if (error) throw error;
      setCoverUrl(supabase.storage.from('captures').getPublicUrl(path).data.publicUrl);
    } catch { toast.error(t('advent.error')); } finally { setUploading(false); }
  };
  const save = async () => {
    if (busy || !title.trim()) return; setBusy(true);
    const row = { title: title.trim(), title_en: titleEn.trim() || null, event_kind: 'advent', calendar_year: year, calendar_days: days as unknown as Json, final_badge_xp: finalXp, published, cover_url: coverUrl || null, species_names: [], rule_categories: [], rule_rarities: [], rule_keywords: [], starts_at: ` ${year}-11-01T00:00:00+01:00`.trim(), ends_at: null, sort_order: -100 };
    const { error } = initial?.id ? await supabase.from('themed_collections').update(row).eq('id', initial.id) : await supabase.from('themed_collections').insert(row);
    setBusy(false);
    if (error) { toast.error(error.message.includes('calendar_rules_locked') ? t('advent.rulesLocked') : t('advent.error')); return; }
    toast.success(t('advent.saved')); onClose();
  };
  const field = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm';
  return <main className="min-h-screen bg-background pb-28"><PageHeader sticky className="bg-background/90 px-5 pb-3 backdrop-blur-xl"><div className="mx-auto flex max-w-lg items-center gap-2"><Button variant="ghost" size="icon" onClick={onClose} aria-label={t('bestiary.common.back')}><ArrowLeft /></Button><h1 className="flex-1 font-display text-lg font-bold">{t('advent.title')}</h1>{initial?.id && <Button variant="ghost" size="icon" aria-label={t('advent.preview')} onClick={() => navigate(`/advent/${initial.id}`)}><Eye /></Button>}</div></PageHeader>
    <div className="mx-auto max-w-lg space-y-5 px-5 py-5">
      <label className="block space-y-2 text-sm font-semibold">{t('advent.titleFr')}<input className={field} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block space-y-2 text-sm font-semibold">{t('advent.titleEn')}<input className={field} value={titleEn} onChange={e => setTitleEn(e.target.value)} /></label>
      <div className="flex items-center gap-4"><img src={coverUrl || cover} loading="lazy" alt="" width={1024} height={1536} className="h-32 w-24 rounded-lg object-cover" /><label className="cursor-pointer text-sm text-primary"><span className="flex items-center gap-2">{uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{t('advent.cover')}</span><input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); }} /></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="space-y-2 text-sm">{t('advent.year')}<input className={field} type="number" min={2026} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} /></label><label className="space-y-2 text-sm">{t('advent.finalXp')}<input className={field} type="number" min={0} max={500} value={finalXp} onChange={e => setFinalXp(Number(e.target.value))} /></label></div>
      <p className="text-xs text-muted-foreground">{t('advent.dates')}</p>
      <div className="divide-y divide-border">{days.map(d => <section key={d.day} className="space-y-3 py-5"><h2 className="font-display font-bold text-primary">{t('advent.day', { day: d.day })}</h2><label className="block space-y-1 text-xs">{t('advent.titleFr')}<input className={field} value={d.title} onChange={e => setDay(d.day, { title: e.target.value })} /></label><label className="block space-y-1 text-xs">{t('advent.titleEn')}<input className={field} value={d.title_en} onChange={e => setDay(d.day, { title_en: e.target.value })} /></label><details><summary className="cursor-pointer text-sm">{t('advent.categories')} · {d.categories.length || t('advent.all')}</summary><div className="mt-3 grid grid-cols-2 gap-2">{ADVENT_CATEGORIES.map(c => <label key={c} className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-primary" checked={d.categories.includes(c)} onChange={e => setDay(d.day, { categories: e.target.checked ? [...d.categories, c] : d.categories.filter(x => x !== c) })} />{c}</label>)}</div></details><label className="flex items-center justify-between gap-3 text-sm">{t('advent.dailyXp')}<input className={`${field} max-w-24`} type="number" min={0} max={500} value={d.xp} onChange={e => setDay(d.day, { xp: Number(e.target.value) })} /></label></section>)}</div>
      <label className="flex items-center justify-between font-display font-semibold">{t('advent.publish')}<input type="checkbox" className="size-5 accent-primary" checked={published} onChange={e => setPublished(e.target.checked)} /></label>
    </div><div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button className="mx-auto flex w-full max-w-lg" disabled={busy || uploading} onClick={save}>{busy && <Loader2 className="animate-spin" />}{t('advent.save')}</Button></div>
  </main>;
}