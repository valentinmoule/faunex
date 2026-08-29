import { ChevronLeft, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

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
  removeLabel = 'Retirer',
}: CollectionHeroProps) {
  const pct = total > 0 ? Math.round((captured / total) * 100) : 0;

  return (
    <header className="relative h-64 sm:h-72 w-full overflow-hidden">
      <img
        src={image}
        alt={`Illustration de ${title}`}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: overlay }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />

      <div className="relative z-10 h-full max-w-lg mx-auto px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-4 flex flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={removeLabel}
              className="p-2 rounded-full bg-background/70 backdrop-blur-md border border-border/50 text-destructive hover:bg-background transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h1 className="font-display font-bold text-3xl text-foreground leading-tight drop-shadow-sm">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground font-display mb-2">{subtitle}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-foreground/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-display font-semibold text-foreground shrink-0">
              {captured}/{total} · {pct}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CollectionHero;
