import { ChevronLeft, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface CollectionHeroProps {
  image: string;
  overlay: string;
  title: string;
  subtitle?: string;
  captured: number;
  total: number;
  icon?: ReactNode;
  onBack: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}

export function CollectionHero({
  image,
  overlay,
  title,
  subtitle,
  captured,
  total,
  icon,
  onBack,
  onRemove,
  removeLabel,
}: CollectionHeroProps) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((captured / total) * 100) : 0;
  const resolvedRemoveLabel = removeLabel ?? t('bestiary.collectionHero.remove');

  return (
    <header className="relative h-64 sm:h-72 w-full overflow-hidden">
      <img
        src={image}
        alt={t('bestiary.collectionHero.altIllustration', { title })}
        className="absolute inset-0 w-full h-full object-cover"
      />
<div className="absolute inset-0" style={{ background: overlay }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />

      <div className="relative z-10 h-full max-w-lg mx-auto px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-4 flex flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label={t('bestiary.collectionHero.back')}
            className="p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={resolvedRemoveLabel}
              className="p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 text-destructive hover:bg-background transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-1">
            {icon}
<h1 className="font-display font-bold text-3xl text-white leading-tight drop-shadow-sm">
              {title}
            </h1>
          </div>
          {subtitle && (
<p className="text-xs text-white/75 font-display mb-2">{subtitle}</p>
          )}
          <div className="flex items-center gap-3">
<div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-display font-semibold text-white/90 shrink-0">
              {captured}/{total} · {pct}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CollectionHero;
