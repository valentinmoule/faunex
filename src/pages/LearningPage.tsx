import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Lock, Sprout, Bean, Loader2, Star } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet, walletKey } from '@/hooks/useWallet';
import { learningStatus, startLesson, learningText, type LearningAttempt } from '@/lib/learning';
import LearningPlayer from '@/components/LearningPlayer';
import sideForest from '@/assets/learning/side-forest.webp';
import sideGarden from '@/assets/learning/side-garden.webp';
import sidePond from '@/assets/learning/side-pond.webp';
import sideMountain from '@/assets/learning/side-mountain.webp';

const chapterWorlds = [sideGarden, sideForest, sidePond, sideMountain];

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
  const currentNode = useRef<HTMLDivElement>(null);
  const arrivalId = current?.id ?? lessons[lessons.length - 1]?.id;
  useEffect(() => {
    if (attempt || !arrivalId) return;
    const frame = requestAnimationFrame(() => currentNode.current?.scrollIntoView({ block: 'center', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [path?.id, arrivalId, attempt]);
  async function open(id: string) { if (!path) return; setBusy(true); setError(''); try { setAttempt(await startLesson(path.id, id)); } catch (e) { const message = String((e as { message?: string }).message); setError(t(message.includes('DAILY_LIMIT') ? 'learning.quota' : message.includes('LESSON_LOCKED') ? 'learning.locked' : 'learning.error')); } finally { setBusy(false); } }
  function refresh() { void client.invalidateQueries({ queryKey: ['learning', session?.user.id] }); void client.invalidateQueries({ queryKey: walletKey(session?.user.id) }); }
  if (attempt) return <LearningPlayer key={attempt.id} initial={attempt} onClose={() => { setAttempt(null); refresh(); }} onFinished={refresh} onRetry={() => { const id = attempt.lesson.id; setAttempt(null); void open(id); }} />;
  return <main className="learning-world min-h-screen bg-background pb-[50svh]">
    <PageHeader sticky className="border-b border-border bg-background px-5 py-4"><div className="mx-auto flex max-w-lg items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate('/home')} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button><h1 className="font-display text-2xl font-bold">{t('learning.title')}</h1><Button variant="ghost" className="ml-auto gap-2 text-primary" onClick={() => navigate('/eclats')} aria-label={t('economy.balance', { amount: wallet.data?.balance ?? 0 })}><Bean className="h-5 w-5" />{wallet.isPending ? '—' : wallet.data?.balance.toLocaleString(i18n.language) ?? 0}</Button></div></PageHeader>
    <div className="mx-auto max-w-lg px-4 pt-4">
      {status.isPending && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
      {status.isError && <><p role="alert" className="text-destructive">{t('learning.error')}</p><Button variant="ghost" onClick={() => void status.refetch()}>{t('learning.retry')}</Button></>}
      {path && data && <>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4"><p className="text-xs font-semibold text-muted-foreground">{t('learning.daily', data)}</p><div className="flex max-w-40 flex-1 gap-1" aria-hidden="true">{Array.from({ length: data.limit }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < data.used ? 'bg-primary' : 'bg-border'}`} />)}</div></div>
        <section className="pb-7 pt-5">
          {data.paths.length > 1 && <Select value={path.id} onValueChange={id => { setPathId(id); if (session?.user.id) localStorage.setItem(`learning-path:${session.user.id}`, id); }}><SelectTrigger className="h-auto min-h-10 border-0 bg-transparent p-0 text-left font-display text-xl font-bold shadow-none [&>span]:whitespace-normal" aria-label={t('learning.choosePath')}><SelectValue /></SelectTrigger><SelectContent>{data.paths.map(p => <SelectItem key={p.id} value={p.id}>{text(p, 'title')}</SelectItem>)}</SelectContent></Select>}
          <div className="mt-3 flex items-center gap-3"><Progress value={lessons.length ? completed.size / lessons.length * 100 : 0} className="h-2 flex-1" /><span className="shrink-0 text-xs font-semibold text-muted-foreground">{t('learning.progress', { done: completed.size, total: lessons.length })}</span></div>
        </section>
        {quota && <section className="border-y border-border py-5"><h2 className="font-display text-lg font-bold">{t('learning.quota')}</h2><p className="mt-2 text-sm text-muted-foreground">{t('learning.quotaMessage', { time: new Date(data.reset_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) })}</p>{data.limit === 3 && <Button variant="ghost" className="mt-2 px-0 text-primary" onClick={() => navigate('/premium')}>{t('learning.premium')}</Button>}</section>}
        {path.chapters.map((chapter, ci) => ({ chapter, ci })).reverse().map(({ chapter, ci }) => <section key={ci} className={`learning-chapter ${ci % 2 ? 'learning-chapter-sky' : ''}`}>
          <div className="learning-chapter-heading flex items-center gap-3 px-4 py-4"><div className="learning-chapter-emblem flex h-11 w-11 shrink-0 items-center justify-center font-display text-xl font-extrabold">{ci + 1}</div><div className="min-w-0"><p className="text-xs font-bold uppercase opacity-80">{t('learning.chapter', { number: ci + 1 })}</p><h2 className="mt-1 font-display text-base font-bold">{text(chapter, 'title')}</h2></div><span className="ml-auto shrink-0 text-sm font-extrabold">{chapter.lessons.filter(l => completed.has(l.id)).length}/{chapter.lessons.length}</span></div>
          <div className="relative"><div aria-hidden="true" className="learning-side learning-side-left" style={{ backgroundImage: `url(${chapterWorlds[ci % chapterWorlds.length]})` }} /><div aria-hidden="true" className="learning-side learning-side-right" style={{ backgroundImage: `url(${chapterWorlds[ci % chapterWorlds.length]})` }} /><div className="learning-board relative mx-auto max-w-sm pb-8 pt-14">{[...chapter.lessons].reverse().map((lesson, li) => {
            const position = lessons.findIndex(item => item.id === lesson.id); const done = completed.has(lesson.id); const active = current?.id === lesson.id; const locked = !done && !active;
            const offset = li % 2 ? 'translate-x-14' : '-translate-x-14';
            return <div key={lesson.id} ref={lesson.id === arrivalId ? currentNode : undefined} className="learning-stop relative flex h-56 flex-col items-center">
              {li < chapter.lessons.length - 1 && <svg aria-hidden="true" viewBox="0 0 300 224" preserveAspectRatio="none" className={`learning-trail pointer-events-none absolute left-1/2 top-12 h-56 w-full -translate-x-1/2 ${li % 2 ? '-scale-x-100' : ''}`}><path d="M 94 0 C 94 100, 206 100, 206 224" /></svg>}
              <div className={`relative z-10 flex w-40 flex-col items-center ${offset}`}>
                {active && !quota && <span className="learning-callout absolute -top-9 whitespace-nowrap px-3 py-1.5 text-xs font-extrabold">{t('learning.current')}</span>}
                <Button variant="ghost" size="icon" disabled={busy || locked || (active && quota)} aria-label={`${text(lesson, 'title')} · ${t(done ? 'learning.done' : locked ? 'learning.locked' : 'learning.current')}`} onClick={() => void open(lesson.id)} className={`learning-node h-24 w-24 ${done ? 'learning-node-done' : active ? 'learning-node-active' : 'learning-node-locked'}`}>
                  <span className="learning-node-face">{busy && active ? <Loader2 className="h-9 w-9 animate-spin" /> : done ? <Check className="h-10 w-10" strokeWidth={4} /> : locked ? <Lock className="h-7 w-7" /> : <Star className="h-10 w-10" fill="currentColor" />}<span className="learning-step-number">{position + 1}</span></span>
                </Button>
                <p className={`learning-stop-title mt-6 px-2 text-center text-sm font-extrabold ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>{text(lesson, 'title')}</p>
                {done && <span className="mt-1 text-xs font-bold text-primary">{t('learning.done')}</span>}
              </div>
            </div>;
          })}</div></div>
        </section>)}
      </>}
      {!status.isPending && !status.isError && !path && <div className="py-20 text-center"><Sprout className="mx-auto mb-5 h-16 w-16 text-primary" /><p className="text-muted-foreground">{t('learning.empty')}</p></div>}
      {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    </div>
  </main>;
}