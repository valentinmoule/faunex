import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import CurrencyBalance from '@/components/CurrencyBalance';
import QuestsInline from '@/components/QuestsInline';

/** Onglet « Défis » : quêtes en tête, puis accès à l'Académie. */
export default function ChallengesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-end gap-4"><CurrencyBalance /></div>
      </PageHeader>
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-6">
        <h1 className="truncate text-3xl font-display font-extrabold tracking-tight text-primary">{t('nav.challenges')}</h1>
        <QuestsInline />
        <section>
          <h2 className="mb-2 text-[15px] font-display font-bold text-foreground">{t('challenges.academyTitle')}</h2>
          <button onClick={() => navigate('/apprendre')} className="flex w-full items-center gap-3 py-3 text-left">
            <GraduationCap className="h-7 w-7 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold text-foreground">{t('learning.title')}</span>
              <span className="block text-[13px] text-muted-foreground">{t('challenges.academyDesc')}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </section>
      </div>
    </main>
  );
}
