import { Compass, Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hapticTap } from '@/lib/haptics';

interface ExplorersEmptyStateProps {
  onSearch: () => void;
}

/** Empty feed state for the Explorers tab: invites the user to find explorers to follow. */
export const ExplorersEmptyState = ({ onSearch }: ExplorersEmptyStateProps) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-[2rem] bg-card border border-border/60 px-6 py-8 text-center shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.35)]">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <span className="absolute -inset-2 rounded-full bg-primary/10 blur-xl" aria-hidden="true" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
            <Compass className="w-9 h-9 text-primary-foreground" strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <h2 className="text-[1.35rem] font-display font-bold text-foreground leading-tight tracking-tight">
          {t('social.explorers.emptyFeed.title')}
        </h2>
        <p className="mt-2 text-[0.95rem] font-body text-foreground/80 leading-relaxed">
          {t('social.explorers.emptyFeed.line1')}
        </p>
        <p className="mt-1 text-sm font-body text-muted-foreground leading-relaxed">
          {t('social.explorers.emptyFeed.line2')}
        </p>

        <button
          onClick={() => {
            hapticTap();
            onSearch();
          }}
          className="mt-7 w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-full bg-primary text-primary-foreground font-display font-semibold text-[0.9rem] leading-none shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-300"
        >
          <Search className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t('social.explorers.emptyFeed.cta')}</span>
        </button>

        <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[11px] font-body text-muted-foreground">
          <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {t('social.explorers.emptyFeed.hint')}
        </p>
      </div>
    </div>
  );
};

export default ExplorersEmptyState;
