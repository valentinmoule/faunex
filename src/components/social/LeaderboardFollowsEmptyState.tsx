import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticTap } from '@/lib/haptics';

/**
 * État vide du classement « Abonnements » : l'explorateur ne suit encore personne.
 * Le classement de tes abonnements reste vide tant que tu ne suis aucun explorateur.
 */
export const LeaderboardFollowsEmptyState = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[52svh] flex-col items-center justify-center px-6 pb-8 pt-4 text-center">
      {/* Médaille : trois emplacements vides autour d'un explorateur */}
      <div className="relative mb-3 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/8" aria-hidden="true" />
        <span className="absolute inset-1 rounded-full border border-dashed border-primary/25" aria-hidden="true" />
        {[0, 120, 240].map((angle) => (
          <span
            key={angle}
            aria-hidden="true"
            className="absolute h-6 w-6 rounded-full border border-dashed border-border bg-card"
            style={{
              transform: `rotate(${angle}deg) translateY(-46px) rotate(${-angle}deg)`,
            }}
          />
        ))}
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-primary/20 to-primary/5 ring-1 ring-primary/25">
          <Users className="h-5 w-5 text-primary" strokeWidth={2.1} aria-hidden="true" />
        </span>
      </div>

      <h2 className="text-[1.35rem] font-display font-bold leading-tight tracking-tight text-foreground">
        {t('social.leaderboard.noFollows.title')}
      </h2>
      <p className="mt-1.5 max-w-[19rem] text-[0.9rem] font-body leading-relaxed text-foreground/75">
        {t('social.leaderboard.noFollows.line1')}
      </p>

      <Button
        size="lg"
        className="mt-5 w-full max-w-xs px-4 text-[0.9rem]"
        onClick={() => {
          hapticTap();
          navigate('/explorers?view=search');
        }}
      >
        <Search className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{t('social.leaderboard.noFollows.cta')}</span>
      </Button>
    </div>
  );
};

export default LeaderboardFollowsEmptyState;
