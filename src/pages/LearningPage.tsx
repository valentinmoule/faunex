import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Lock, Sprout, Trophy, Bean, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet, walletKey } from '@/hooks/useWallet';
import { learningStatus, startLesson, learningText, type LearningAttempt } from '@/lib/learning';
import LearningPlayer from '@/components/LearningPlayer';

export default function LearningPage() {
  const { t, i18n } = useTranslation(); const navigate = useNavigate(); const { session } = useAuth(); const client = useQueryClient(); const wallet = useWallet();
  const status = useQuery({ queryKey: ['learning', session?.user.id], queryFn: learningStatus, staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 60_000 });
  const [pathId, setPathId] = useState(() => session?.user.id ? localStorage.getItem(`learning-path:${session.user.id}`) ?? '' : '');
  const [attempt, setAttempt] = useState<LearningAttempt | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const data = status.data; const path = data?.paths.find(p => p.id === pathId) ?? data?.paths[0];
  const text = (item: object, key: string) => learningText(item as Record<string, unknown>, key, i18n.language.startsWith('en'));
  const lessons = path?.chapters.flatMap(c => c.lessons) ?? [];
  const completed = new Set(data?.completed.filter(c => c.path_id === path?.id).map(c => c.lesson_id));
  const current = lessons.find(l => !completed.has(l.id)); const quota = Boolean(data && data.used >= data.limit);
  async function open(id: string) { if (!path) return; setBusy(true); setError(''); try { setAttempt(await startLesson(path.id, id)); } catch (e) { const message = String((e as { message?: string }).message); setError(t(message.includes('DAILY_LIMIT') ? 'learning.quota' : message.includes('LESSON_LOCKED') ? 'learning.locked' : 'learning.error')); } finally { setBusy(false); } }
  function refresh() { void client.invalidateQueries({ queryKey: ['learning', session?.user.id] }); void client.invalidateQueries({ queryKey: walletKey(session?.user.id) }); }
  if (attempt) return <LearningPlayer key={attempt.id} initial={attempt} onClose={() => { setAttempt(null); refresh(); }} onFinished={refresh} onRetry={() => { const id = attempt.lesson.id; setAttempt(null); void open(id); }} />;
  let step = 0;
  return <main className="min-h-screen bg-background pb-28">
    <PageHeader sticky className="border-b border-border bg-background px-5 py-4"><div className="mx-auto flex max-w-lg items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate('/home')} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button><h1 className="font-display text-2xl font-bold">{t('learning.title')}</h1><Button variant="ghost" className="ml-auto gap-2 text-primary" onClick={() => navigate('/eclats')} aria-label={t('economy.balance', { amount: wallet.data?.balance ?? 0 })}><Bean className="h-5 w-5" />{wallet.isPending ? '—' : wallet.data?.balance.toLocaleString(i18n.language) ?? 0}</Button></div></PageHeader>
    <div className="mx-auto max-w-lg px-5 py-6">
      {status.isPending && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
      {status.isError && <><p role="alert" className="text-destructive">{t('learning.error')}</p><Button variant="ghost" onClick={() => void status.refetch()}>{t('learning.retry')}</Button></>}
      {path && data && <>
        <p className="mb-5 text-sm font-semibold text-muted-foreground">{t('learning.daily', data)}</p>
        <Select value={path.id} onValueChange={id => { setPathId(id); if (session?.user.id) localStorage.setItem(`learning-path:${session.user.id}`, id); }}><SelectTrigger className="h-auto min-h-12 whitespace-normal text-left font-display font-bold" aria-label={t('learning.choosePath')}><SelectValue /></SelectTrigger><SelectContent>{data.paths.map(p => <SelectItem key={p.id} value={p.id}>{text(p, 'title')}</SelectItem>)}</SelectContent></Select>
        <div className="my-5"><p className="mb-2 text-sm text-muted-foreground">{t('learning.progress', { done: completed.size, total: lessons.length })}</p><Progress value={lessons.length ? completed.size / lessons.length * 100 : 0} className="h-2" /></div>
        {quota && <section className="border-y border-border py-5"><h2 className="font-display text-lg font-bold">{t('learning.quota')}</h2><p className="mt-2 text-sm text-muted-foreground">{t('learning.quotaMessage', { time: new Date(data.reset_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) })}</p>{data.limit === 3 && <Button variant="ghost" className="mt-2 px-0 text-primary" onClick={() => navigate('/premium')}>{t('learning.premium')}</Button>}</section>}
        <Button className="my-3 w-full" disabled={busy || (Boolean(current) && quota)} onClick={() => void open(current?.id ?? lessons[0]?.id)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t(current ? 'learning.resume' : 'learning.review')}</Button>
        {path.chapters.map((chapter, ci) => <section key={ci} className="py-4"><div className="mb-4 border-b border-border pb-3"><p className="text-xs font-semibold uppercase text-muted-foreground">{t('learning.chapter', { number: ci + 1 })}</p><h2 className="mt-1 font-display text-lg font-bold">{text(chapter, 'title')}</h2></div><div className="relative py-3">{chapter.lessons.map(lesson => {
          const position = step++; const done = completed.has(lesson.id); const active = current?.id === lesson.id; const locked = !done && !active; const offset = ['mr-20', 'ml-8', 'ml-20', 'mr-8'][position % 4];
          return <div key={lesson.id} className="relative flex min-h-36 flex-col items-center"><div aria-hidden="true" className="absolute bottom-0 top-0 w-1 rounded-full bg-border" /><div className={`relative z-10 flex w-44 flex-col items-center ${offset}`}><Button variant={done || active ? 'default' : 'secondary'} size="icon" disabled={busy || locked || (active && quota)} aria-label={`${text(lesson, 'title')} · ${t(done ? 'learning.done' : locked ? 'learning.locked' : 'learning.current')}`} onClick={() => void open(lesson.id)} className={`h-16 w-16 rounded-full border-b-4 border-foreground/10 ${active && !quota ? 'ring-4 ring-primary/20 motion-safe:animate-pulse' : ''}`}>{done ? <Check className="h-7 w-7" /> : locked ? <Lock className="h-6 w-6" /> : lesson.special ? <Trophy className="h-7 w-7" /> : <Sprout className="h-7 w-7" />}</Button><p className={`mb-4 mt-3 text-center text-sm font-semibold ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>{text(lesson, 'title')}</p></div></div>;
        })}</div></section>)}
      </>}
      {!status.isPending && !status.isError && !path && <div className="py-20 text-center"><Sprout className="mx-auto mb-5 h-16 w-16 text-primary" /><p className="text-muted-foreground">{t('learning.empty')}</p></div>}
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    </div>
  </main>;
}