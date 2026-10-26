import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hapticTap } from '@/lib/haptics';
import { SwirlAvatarsBackdrop } from '@/components/SwirlAvatarsBackdrop';
import { Button } from '@/components/ui/button';

interface ExplorersEmptyStateProps {
  onSearch: () => void;
}

/** Empty feed state for the Explorers tab: invites the user to find explorers to follow. */
export const ExplorersEmptyState = ({ onSearch }: ExplorersEmptyStateProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70svh] px-4 text-center">
      <SwirlAvatarsBackdrop />
      <div className="relative z-10 w-full max-w-sm px-2 py-4">
        <h2 className="text-[1.6rem] font-display font-bold text-foreground leading-tight tracking-tight">
          {t('social.explorers.emptyFeed.title')}
        </h2>
        <p className="mt-2.5 text-[0.95rem] font-body text-foreground/80 leading-relaxed">
          {t('social.explorers.emptyFeed.line1')}
        </p>
        <p className="mt-1 text-sm font-body text-muted-foreground leading-relaxed">
          {t('social.explorers.emptyFeed.line2')}
        </p>


        <Button
          size="lg"
          onClick={() => {
            hapticTap();
            onSearch();
          }}
          className="mt-7 w-full px-4 text-[0.9rem]"
        >
          <Search className="w-[1.05rem] h-[1.05rem] shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t('social.explorers.emptyFeed.cta')}</span>
        </Button>

        <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-[11px] font-body text-muted-foreground">
          <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {t('social.explorers.emptyFeed.hint')}
        </p>
      </div>
    </div>
  );
};

export default ExplorersEmptyState;
