import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Play, Sprout } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import QuestsInline from '@/components/QuestsInline';
import { useAuth } from '@/contexts/AuthContext';
import { learningStatus, learningText } from '@/lib/learning';
import sideForest from '@/assets/learning/side-forest.webp';
import sideGarden from '@/assets/learning/side-garden.webp';
import sidePond from '@/assets/learning/side-pond.webp';
import sideMountain from '@/assets/learning/side-mountain.webp';

const worlds = [sideGarden, sideForest, sidePond, sideMountain];

/** Onglet « Défis » : Académie mise en avant, puis les quêtes. */
export default function ChallengesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const status = useQuery({ queryKey: ['learning', session?.user.id], queryFn: learningStatus, enabled: !!session?.user });
  const data = status.data;
  const pathId = session?.user.id ? localStorage.getItem(`learning-path:${session.user.id}`) : null;
  const path = data?.paths.find(p => p.id === pathId) ?? data?.paths[0];
  const en = i18n.language.startsWith('en');
  const done = new Set(data?.completed.filter(c => c.path_id === path?.id).map(c => c.lesson_id));
  const chapters = path?.chapters ?? [];
  const chapterIndex = Math.max(0, chapters.findIndex(c => c.lessons.some(l => !done.has(l.id))));
  const chapter = chapters[chapterIndex];
  const chapterDone = chapter ? chapter.lessons.filter(l => done.has(l.id)).length : 0;
  const total = chapter?.lessons.length ?? 0;
  const allDone = chapters.length > 0 && chapters.every(c => c.lessons.every(l => done.has(l.id)));
  const pct = total ? Math.round((chapterDone / total) * 100) : 0;
  const cta = allDone ? t('challenges.review') : done.size === 0 ? t('challenges.start') : t('challenges.continue');

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-end gap-4"></div>
      </PageHeader>
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-6">
        <h1 className="sr-only">{t('nav.challenges')}</h1>

        <button
          onClick={() => navigate('/apprendre')}
          className="relative block w-full overflow-hidden rounded-3xl border border-border text-left shadow-card active:scale-[0.98] transition-transform"
        >
          <img src={worlds[chapterIndex % worlds.length]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          <div className="relative flex min-h-[220px] flex-col justify-end gap-3 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-[11px] font-display font-bold uppercase tracking-wider text-primary">
              <Sprout className="h-3.5 w-3.5" />{t('challenges.academyTitle')}
            </span>
            <div>
              {chapter && <p className="text-[12px] font-display font-bold text-background/80">{t('challenges.chapter', { n: chapterIndex + 1 })}</p>}
              <p className="text-2xl font-display font-extrabold leading-tight text-background">
                {chapter ? learningText(chapter as unknown as Record<string, unknown>, 'title', en) : t('learning.title')}
              </p>
              {!chapter && <p className="text-[13px] text-background/80">{t('challenges.academyDesc')}</p>}
            </div>
            {chapter && (
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background/30">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[12px] font-display font-bold text-background">{t('challenges.progress', { done: chapterDone, total })}</span>
              </div>
            )}
            <span className="game-button flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-display font-extrabold text-primary-foreground shadow-[0_4px_0_hsl(var(--primary-dark,var(--primary))/0.6)]">
              <Play className="h-4 w-4 fill-current" />{cta}
            </span>
          </div>
        </button>

        <QuestsInline />
      </div>
    </main>
  );
}
