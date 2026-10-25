import { useState } from 'react';
import { Bean, Check, X, ArrowLeft, Sprout, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { answerLesson, finishLesson, learningText, type LearningAttempt } from '@/lib/learning';

export default function LearningPlayer({ initial, onClose, onFinished, onRetry, preview = false }: { initial: LearningAttempt; onClose: () => void; onFinished: () => void; onRetry: () => void; preview?: boolean }) {
  const { t, i18n } = useTranslation();
  const english = i18n.language.startsWith('en');
  const [attempt, setAttempt] = useState(initial);
  const [index, setIndex] = useState(Math.min(initial.answers.length, initial.lesson.questions.length - 1));
  const [intro, setIntro] = useState(initial.answers.length === 0);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const question = attempt.lesson.questions[index];
  const checked = index < attempt.answers.length;
  const selected = checked ? attempt.answers[index] : choice;
  const correct = checked && selected === question?.correct;
  const options = english && question?.options_en.length ? question.options_en : question?.options ?? [];
  const text = (item: object, key: string) => learningText(item as Record<string, unknown>, key, english);
  async function verify() {
    if (choice === null) return;
    setBusy(true); setError('');
    try {
      if (preview) setAttempt({ ...attempt, answers: [...attempt.answers, choice] });
      else setAttempt(await answerLesson(attempt.id, index, choice));
    } catch { setError(t('learning.error')); } finally { setBusy(false); }
  }
  async function next() {
    if (index < attempt.lesson.questions.length - 1) { setIndex(index + 1); setChoice(null); return; }
    setBusy(true); setError('');
    try {
      if (preview) {
        const score = attempt.answers.filter((answer, i) => answer === attempt.lesson.questions[i].correct).length;
        setAttempt({ ...attempt, finished: true, result: { score, total: attempt.lesson.questions.length, passed: score * 100 >= attempt.lesson.questions.length * 80, reward: 0, balance_delta: 0 } });
      } else { setAttempt(await finishLesson(attempt.id)); onFinished(); }
    } catch (e) { setError(String((e as { message?: string }).message).includes('DAILY_LIMIT') ? t('learning.quota') : t('learning.error')); } finally { setBusy(false); }
  }
  const result = attempt.result;
  return <main className="min-h-screen bg-background pb-12">
    <PageHeader sticky className="border-b border-border bg-background px-5 py-4"><div className="mx-auto flex max-w-lg items-center gap-3"><Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button><h1 className="min-w-0 font-display text-lg font-bold">{preview ? t('learning.preview') : text(attempt.lesson, 'title')}</h1></div></PageHeader>
    <div className="mx-auto max-w-lg px-5 py-6">
      {attempt.finished && result ? <>
        <div className="py-6 text-center"><Sprout className="mx-auto mb-5 h-20 w-20 text-primary" /><h2 className="font-display text-2xl font-bold">{t(result.passed ? result.reward > 0 ? 'learning.success' : 'learning.revisionSuccess' : 'learning.failure')}</h2><p className="mt-3 text-muted-foreground">{t('learning.score', result)}</p>{result.reward > 0 && <p className="mt-5 flex items-center justify-center gap-2 font-display text-xl font-bold text-primary"><Bean className="h-6 w-6" />{t('learning.reward', { amount: result.reward })}</p>}</div>
        {!result.passed && <ul className="mb-6 divide-y divide-border">{attempt.lesson.questions.map((q, i) => attempt.answers[i] !== q.correct && <li key={i} className="py-4"><p className="font-semibold">{text(q, 'prompt')}</p><p className="mt-2 text-primary">{(english ? q.options_en : q.options)[q.correct ?? 0]}</p><p className="mt-2 text-sm text-muted-foreground">{text(q, 'explanation')}</p></li>)}</ul>}
        {!result.passed && <Button className="mb-3 w-full" onClick={onRetry}>{t('learning.retry')}</Button>}<Button variant={result.passed ? 'default' : 'ghost'} className="w-full" onClick={onClose}>{t('learning.backPath')}</Button>
      </> : intro ? <section className="py-8"><Sprout className="mb-6 h-16 w-16 text-primary" /><h2 className="font-display text-2xl font-bold">{text(attempt.lesson, 'title')}</h2><p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">{text(attempt.lesson, 'intro')}</p><Button className="mt-8 w-full" onClick={() => setIntro(false)}>{t('learning.start')}</Button></section> : question ? <>
        <Progress value={index / attempt.lesson.questions.length * 100} className="h-2" /><p className="mt-3 text-sm text-muted-foreground">{t('learning.question', { number: index + 1, total: attempt.lesson.questions.length })}</p>
        {question.type === 'visual' && question.image && <figure className="mt-6"><img src={question.image} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" /><figcaption className="mt-1 text-xs text-muted-foreground">{question.credit}</figcaption></figure>}
        <h2 className="mb-6 mt-6 font-display text-xl font-bold">{text(question, 'prompt')}</h2>
        <div role="radiogroup" aria-label={text(question, 'prompt')} className="space-y-3">{options.map((option, i) => <Button key={i} role="radio" aria-checked={selected === i} variant="outline" disabled={checked || busy} onClick={() => setChoice(i)} className={`h-auto min-h-14 w-full justify-start whitespace-normal rounded-lg px-4 py-4 text-left ${selected === i ? 'border-primary bg-primary/10 text-primary' : ''} ${checked && question.correct === i ? 'border-primary bg-primary/10 text-primary' : ''}`}><span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">{checked && question.correct === i ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}</span><span>{option}</span></Button>)}</div>
        {checked && <div role="status" className="mt-6 border-t border-border pt-5"><p className={`flex items-center gap-2 font-bold ${correct ? 'text-primary' : 'text-destructive'}`}>{correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}{t(correct ? 'learning.correct' : 'learning.incorrect')}</p><p className="mt-2 leading-relaxed text-muted-foreground">{text(question, 'explanation')}</p></div>}
        <Button className="mt-6 w-full" disabled={busy || (!checked && choice === null)} onClick={checked ? next : verify}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t(checked ? index === attempt.lesson.questions.length - 1 ? 'learning.finish' : 'learning.next' : 'learning.verify')}</Button>
      </> : null}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  </main>;
}