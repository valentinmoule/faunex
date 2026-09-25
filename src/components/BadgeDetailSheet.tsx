/**
 * Fiche plein écran d'un badge déjà débloqué, façon écran « Succès » de
 * Duolingo : illustration en grand, date de déblocage dans une pastille et
 * phrase « Tu as gagné X XP et décroché le badge … ! ». Consultation seule :
 * l'XP a déjà été récolté.
 */
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import BadgeMedallion, { GROUP_HUE } from '@/components/BadgeMedallion';
import type { BadgeProgress } from '@/hooks/useBadges';
import { shareContent } from '@/lib/share';
import { shareOrigin } from '@/lib/authRedirect';

const MEDALLION = 200;

interface Props {
  entry: BadgeProgress;
  onClose: () => void;
}

const BadgeDetailSheet = ({ entry, onClose }: Props) => {
  const { t, i18n } = useTranslation();
  const { badge, claimedAt } = entry;
  const hue = GROUP_HUE[badge.group];

  const host = useMemo(
    () => [...document.querySelectorAll('[role="dialog"]')].pop() ?? document.body,
    [],
  );

  const earnedDate = useMemo(() => {
    if (!claimedAt) return null;
    return new Date(claimedAt)
      .toLocaleDateString(i18n.language.startsWith('en') ? 'en-GB' : 'fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      .toUpperCase()
      .replace(/\./g, '.');
  }, [claimedAt, i18n.language]);

  const share = async () => {
    const result = await shareContent({
      title: 'Faunex',
      text: t('profile.badges.shareText', { name: badge.name }),
      url: shareOrigin(),
    });
    if (result === 'copied') toast(t('profile.quests.linkCopied'));
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background animate-in fade-in duration-200">
      {/* Teinte pastel de la famille du badge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 55% at 50% 18%, hsl(var(${hue.from}) / 0.22), transparent 68%), radial-gradient(90% 42% at 50% 102%, hsl(var(${hue.to}) / 0.16), transparent 74%)`,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('profile.reward.close')}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-transform active:scale-95"
        >
          <X className="size-4" />
        </button>
        <button
          type="button"
          onClick={share}
          aria-label={t('profile.badges.shareAria')}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-transform active:scale-95"
        >
          <Share2 className="size-4" />
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
        <BadgeMedallion
          badgeId={badge.id}
          group={badge.group}
          fallbackEmoji={badge.icon}
          state="claimed"
          size={MEDALLION}
          className="celebration-pop"
        />

        {earnedDate && (
          <span className="celebration-pop mt-7 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-display font-black uppercase tracking-wide text-amber">
            {earnedDate}
          </span>
        )}

        <p className="celebration-pop mt-4 max-w-xs font-display text-2xl font-black leading-snug text-foreground">
          {t('profile.badges.earnedText', { xp: badge.xp, name: badge.name })}
        </p>
      </div>
    </div>
  , host);
};

export default BadgeDetailSheet;
