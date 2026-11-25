import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, X, ArrowLeft, Loader2, Play, Pause, Star, Share2, Flame, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import foxThink from '@/assets/learning/fox-think-anim.webp';
import foxHappy from '@/assets/learning/fox-happy-once.webp';
import foxOops from '@/assets/learning/fox-oops-once.webp';
import foxCombo from '@/assets/learning/fox-combo-anim.webp';
import foxComboLoop from '@/assets/learning/fox-combo-loop.webp';
import foxHappyLoop from '@/assets/learning/fox-happy-loop.webp';
import { answerLesson, finishLesson, learningText, quizStars, type LearningAttempt, type LearningQuestion } from '@/lib/learning';

function SoundPlayer({ src }: { src: string }) {
  const { t } = useTranslation();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); };
  return <div className="mt-6 flex flex-col items-center rounded-3xl bg-muted/60 px-5 py-8">
    <audio ref={audio} src={src} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" onClick={toggle} aria-label={t(playing ? 'learning.pause' : 'learning.play')} className="game-button flex h-20 w-20 items-center justify-center rounded-full">{playing ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}</button>
    <div aria-hidden className="mt-5 flex h-8 items-end gap-1">{Array.from({ length: 18 }, (_, i) => <span key={i} className={`learning-wave w-1.5 rounded-full bg-primary ${playing ? 'learning-wave-on' : ''}`} style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 90}ms` }} />)}</div>
    <p className="mt-3 text-sm font-semibold text-muted-foreground">{t('learning.listen')}</p>
  </div>;
}

export default function LearningPlayer({ initial, onClose, onFinished, onRetry, preview = false }: { initial: LearningAttempt; onClose: () => void; onFinished: () => void; onRetry: () => void; preview?: boolean }) {
  const { t, i18n } = useTranslation();
  const english = i18n.language.startsWith('en');
  const [attempt, setAttempt] = useState(initial);
  const [leaving, setLeaving] = useState(false);
  const [index, setIndex] = useState(Math.min(initial.answers.length, initial.lesson.questions.length - 1));
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);
  const shownMilestones = useRef(new Set<number>());
  const questions = attempt.lesson.questions;
  const question = questions[index] as LearningQuestion | undefined;
  const checked = index < attempt.answers.length;
  const selected = checked ? attempt.answers[index] : choice;
  const correct = checked && selected === question?.correct;
  const options = english && question?.options_en.length ? question.options_en : question?.options ?? [];
  const text = (item: object, key: string) => learningText(item as Record<string, unknown>, key, english);
  // Current streak of correct answers, known only for already checked questions.
  let streak = 0;
  for (let i = attempt.answers.length - 1; i >= 0 && attempt.answers[i] === questions[i]?.correct; i--) streak++;
  const pictures = question && (question.type === 'duel' || question.type === 'intruder') && question.images?.length === options.length ? question.images : null;

  async function pick(i: number) {
    if (checked || busy) return;
    setChoice(i);
    setBusy(true); setError('');
    try {
      if (preview) setAttempt({ ...attempt, answers: [...attempt.answers, i], lesson: attempt.lesson });
      else setAttempt(await answerLesson(attempt.id, index, i));
      navigator.vibrate?.(i === question?.correct || question?.correct === undefined ? 15 : [30, 40, 30]);
    } catch { setError(t('learning.error')); setChoice(null); } finally { setBusy(false); }
  }
  function advance() { setMilestone(null); setIndex(index + 1); setChoice(null); window.scrollTo({ top: 0 }); }
  async function next() {
    if (index < questions.length - 1) {
      if (correct && (streak === 3 || streak === 5) && !shownMilestones.current.has(streak)) { shownMilestones.current.add(streak); setMilestone(streak); navigator.vibrate?.([20, 40, 20, 40, 60]); return; }
      advance(); return;
    }
    setBusy(true); setError('');
    try {
      if (preview) {
        const score = attempt.answers.filter((answer, i) => answer === questions[i].correct).length;
        setAttempt({ ...attempt, finished: true, result: { score, total: questions.length, passed: score * 100 >= questions.length * 80, reward: 0, balance_delta: 0 } });
      } else { setAttempt(await finishLesson(attempt.id)); onFinished(); }
    } catch (e) { setError(String((e as { message?: string }).message).includes('DAILY_LIMIT') ? t('learning.quota') : t('learning.error')); } finally { setBusy(false); }
  }
  const result = attempt.result;
  let bestStreak = 0; for (let i = 0, run = 0; i < attempt.answers.length; i++) { run = attempt.answers[i] === questions[i]?.correct ? run + 1 : 0; bestStreak = Math.max(bestStreak, run); }
  const remaining = questions.length - attempt.answers.length;
  const stars = result ? quizStars(result.score, result.total) : 0;
  async function share() {
    if (!result) return;
    const message = t('learning.shareText', { title: text(attempt.lesson, 'title'), score: result.score, total: result.total, stars: '⭐'.repeat(stars) || '🦊', rank: t(`learning.rank${stars}`) });
    try {
      if (navigator.share) await navigator.share({ text: message });
      else { await navigator.clipboard.writeText(message); setCopied(true); }
    } catch { /* partage annulé */ }
  }
  const state = (i: number) => checked ? (question?.correct === i ? 'right' : selected === i ? 'wrong' : 'idle') : selected === i ? 'picked' : 'idle';

  return <main className={`min-h-screen bg-background ${checked && !attempt.finished ? 'pb-72' : 'pb-12'}`}>
    <PageHeader sticky className="border-b border-border bg-background px-5 py-3"><div className="mx-auto flex max-w-lg items-center gap-3">
      <Button variant="ghost" size="icon" onClick={() => !attempt.finished && attempt.answers.length > 0 ? setLeaving(true) : onClose()} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button>
      {attempt.finished ? <h1 className="min-w-0 truncate font-display text-lg font-bold">{preview ? t('learning.preview') : text(attempt.lesson, 'title')}</h1>
        : <><Progress value={(attempt.answers.length) / questions.length * 100} className="h-3 flex-1" aria-label={t('learning.question', { number: index + 1, total: questions.length })} />
          <span className={`flex min-w-12 items-center justify-end gap-1 font-display text-sm font-bold ${streak >= 2 ? 'text-accent-foreground' : 'text-muted-foreground'}`}>{streak >= 2 ? <><Flame className="h-4 w-4 text-destructive" />{t('learning.combo', { count: streak })}</> : `${index + 1}/${questions.length}`}</span></>}
    </div></PageHeader>
    <div className="mx-auto max-w-lg px-5 py-6">
      {attempt.finished && result ? <>
        <section className="flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center text-center">
          <img src={stars >= 2 ? foxComboLoop : foxHappyLoop} alt="" width={176} height={176} className="learning-fox h-44 w-44 object-contain" />
          <div className="mt-2 flex items-end justify-center gap-1.5" aria-label={`${stars}/3`}>{[0, 1, 2].map(i => <Star key={i} style={{ animationDelay: `${i * 160}ms` }} className={`learning-star ${i === 1 ? 'h-10 w-10' : 'mb-0.5 h-8 w-8'} ${i < stars ? 'fill-[hsl(var(--amber))] text-[hsl(var(--amber-dark))]' : 'fill-muted text-muted'}`} />)}</div>
          <h2 className="mt-4 font-display text-3xl font-black text-primary">{t(`learning.rank${stars}`)}</h2>
          <p className="mt-2 text-muted-foreground">{t(`learning.rankLine${stars}`)}</p>
          <div className="mt-8 grid w-full grid-cols-3 gap-3">
            {[
              { label: t('learning.xpEarned'), value: String(result.reward), tone: 'amber' },
              { label: t('learning.bestCombo'), value: `×${bestStreak}`, tone: 'primary' },
              { label: t('learning.accuracy'), value: `${Math.round(result.score * 100 / Math.max(1, result.total))} %`, tone: 'accent' },
            ].map(card => <div key={card.label} className={`overflow-hidden rounded-2xl border-2 bg-card ${card.tone === 'amber' ? 'border-[hsl(var(--amber))]' : card.tone === 'primary' ? 'border-primary' : 'border-accent'}`}>
              <p className={`py-1 text-[10px] font-black uppercase tracking-wider ${card.tone === 'amber' ? 'bg-[hsl(var(--amber))] text-foreground' : card.tone === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>{card.label}</p>
              <p className={`py-3 font-display text-2xl font-black ${card.tone === 'amber' ? 'text-[hsl(var(--amber-dark))]' : card.tone === 'primary' ? 'text-primary' : 'text-accent-foreground'}`}>{card.value}</p>
            </div>)}
          </div>
        </section>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex max-w-lg gap-3">
            {!preview && <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => void share()} aria-label={copied ? t('learning.copied') : t('learning.share')}><Share2 className="h-5 w-5" /></Button>}
            {!result.passed && <Button variant="outline" className="h-12 flex-1" onClick={onRetry}>{t('learning.retry')}</Button>}
            <Button className="h-12 flex-1" onClick={onClose}>{result.reward > 0 ? t('learning.claimXp') : t('learning.next')}</Button>
          </div>
        </div>
      </> : question ? <>
        {index === 0 && !checked && <p className="mb-4 text-sm font-semibold text-muted-foreground">{text(attempt.lesson, 'intro')}</p>}
        <div className="flex items-center gap-3">
          <img key={index} src={foxThink} alt="" width={64} height={64} className="learning-fox h-16 w-16 shrink-0 object-contain" />
          <p className="learning-bubble rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{t(`learning.${question.type}`)}</p>
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{text(question, 'prompt')}</h2>
        {question.type === 'visual' && question.image && <img src={question.image} alt="" className="mt-5 aspect-[4/3] w-full rounded-2xl object-cover" />}
        {question.type === 'audio' && question.audio && <SoundPlayer key={question.audio} src={question.audio} />}
        {pictures ? <div role="radiogroup" aria-label={text(question, 'prompt')} className={`mt-6 grid gap-3 ${pictures.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {pictures.map((src, i) => <button key={i} type="button" role="radio" aria-checked={selected === i} aria-label={options[i]} disabled={checked || busy} onClick={() => void pick(i)} data-state={state(i)} className="learning-photo group relative overflow-hidden rounded-2xl text-left">
            <img src={src} alt="" className={`w-full object-cover ${pictures.length === 2 ? 'aspect-[3/4]' : 'aspect-square'}`} />
            {(question.type === 'intruder' || checked) && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent px-3 pb-2 pt-6 text-sm font-bold text-background">{question.type === 'intruder' ? options[i] : ''}</span>}
            {state(i) === 'right' && <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-5 w-5" /></span>}
            {state(i) === 'wrong' && <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground"><X className="h-5 w-5" /></span>}
          </button>)}
        </div> : <div role="radiogroup" aria-label={text(question, 'prompt')} className={`mt-6 ${question.type === 'boolean' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>{options.map((option, i) => <Button key={i} role="radio" aria-checked={selected === i} data-correct={checked ? question.correct === i : undefined} variant="outline" disabled={checked || busy} onClick={() => void pick(i)} className={`learning-answer h-auto min-h-14 w-full whitespace-normal rounded-2xl px-4 py-4 ${question.type === 'boolean' ? 'justify-center text-lg font-bold' : 'justify-start text-left'}`}>{question.type !== 'boolean' && <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">{state(i) === 'wrong' ? <X className="h-4 w-4" /> : state(i) === 'right' ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}</span>}<span>{option}</span></Button>)}</div>}
        {question.credit && <p className="mt-2 break-words text-[10px] leading-snug text-muted-foreground">{question.credit}</p>}
        {busy && !checked && <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-muted-foreground" />}
        {checked && correct && <div key={`sticker-${index}`} aria-hidden className="learning-sticker pointer-events-none fixed inset-x-0 top-1/3 z-[70] flex justify-center"><span className="rounded-2xl border-4 border-card bg-[hsl(var(--amber))] px-5 py-2 font-display text-2xl font-black uppercase text-foreground shadow-lg">{streak >= 2 ? t('learning.combo', { count: streak }) : t('learning.perfect')}<small className="mt-0.5 block text-center text-base font-black text-primary">{t('learning.answerXp')}</small></span></div>}
        {checked && <div role="status" className={`learning-drawer fixed inset-x-0 bottom-0 z-[60] border-t-2 px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 ${correct ? 'learning-drawer-right' : 'learning-drawer-wrong'}`}>
          <div className="mx-auto flex max-w-lg gap-3">
            <img key={`fox-${index}`} src={`${correct ? foxHappy : foxOops}#${index}`} alt="" width={80} height={80} className={`${correct ? 'learning-fox-jump' : 'learning-fox-shrug'} -mt-12 h-20 w-20 shrink-0 object-contain`} />
            <div className="min-w-0 flex-1">
              <p className={`flex items-center gap-2 font-display text-xl font-black ${correct ? 'text-primary' : 'text-destructive'}`}>{correct ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}{t(correct ? 'learning.correct' : 'learning.incorrect')}</p>
              {!correct && question.correct !== undefined && <p className="mt-1 text-sm font-bold text-destructive">{t('learning.answerWas', { answer: options[question.correct] })}</p>}
              <p className="mt-1 line-clamp-4 text-sm leading-snug text-foreground"><Lightbulb className="mr-1 inline h-3.5 w-3.5 text-[hsl(var(--amber-dark))]" />{text(question, 'explanation')}</p>
            </div>
          </div>
          <Button className={`game-button mx-auto mt-4 flex h-14 w-full max-w-lg text-base uppercase ${correct ? '' : 'learning-button-wrong'}`} disabled={busy} onClick={() => void next()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t(index === questions.length - 1 ? 'learning.finish' : 'learning.next')}</Button>
        </div>}
        {milestone && <div role="dialog" aria-modal="true" aria-label={t('learning.milestone', { count: milestone })} className="learning-milestone fixed inset-0 z-[80] flex flex-col items-center justify-center bg-foreground px-6 text-center">
          <span aria-hidden className="learning-bolt" />
          <span aria-hidden className="learning-glow" />
          <span aria-hidden className="learning-ring" />
          <span aria-hidden className="learning-ring learning-ring-2" />
          <span aria-hidden className="learning-sparks">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</span>
          <img src={foxCombo} alt="" width={240} height={240} className="learning-fox-flex relative h-60 w-60 object-contain" />
          <h2 className="learning-milestone-title relative mt-4 font-display text-4xl font-black text-[hsl(var(--amber))]">{t('learning.milestone', { count: milestone })}</h2>
          <p className="learning-milestone-line relative mt-2 text-background/80">{t('learning.milestoneLine')}</p>
          <Button className="game-button relative mt-8 h-14 w-full max-w-sm text-base uppercase" onClick={advance}>{t('learning.next')}</Button>
        </div>}
      </> : null}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
    {leaving && <div className="fixed inset-0 z-[80] flex items-end bg-foreground/40" onClick={() => setLeaving(false)}>
      <div role="dialog" aria-modal="true" className="learning-drawer w-full rounded-t-3xl bg-card px-6 pb-8 pt-3 text-center" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <img src={foxOops} alt="" width={128} height={128} className="fox-fur mx-auto h-32 w-32 object-contain" />
        <p className="mt-3 font-display text-xl font-bold">{t('learning.leaveTitle', { count: remaining })}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('learning.leaveLine')}</p>
        <span role="button" tabIndex={0} onClick={() => setLeaving(false)} className="game-button mt-5 flex h-12 w-full items-center justify-center font-display">{t('learning.next')}</span>
        <Button variant="ghost" className="mt-2 w-full font-display font-black uppercase text-destructive" onClick={onClose}>{t('learning.quit')}</Button>
      </div>
    </div>}
  </main>;
}
