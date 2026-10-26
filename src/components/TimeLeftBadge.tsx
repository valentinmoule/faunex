import { Clock } from 'lucide-react';

interface TimeLeftBadgeProps {
  /** Libellé suivi d'une espace, ex. « Réinitialisation dans ». */
  label: string;
  /** Durée restante formatée, ex. « 6j 11:14:32 ». */
  value: string;
  className?: string;
}

/** Pastille d'échéance hebdomadaire : horloge qui tourne + durée restante.
 *  Partagée par le classement de la semaine et le vote Photo de la semaine. */
export const TimeLeftBadge = ({ label, value, className = '' }: TimeLeftBadgeProps) => (
  <div className={`inline-flex shrink-0 items-center gap-1 px-2 py-1.5 rounded-full bg-amber/5 border border-amber/15 ${className}`}>
    <div className="relative flex items-center justify-center">
      <Clock className="w-3.5 h-3.5 text-muted-foreground animate-[spin_4s_linear_infinite]" />
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber/60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
      </span>
    </div>
    <p className="whitespace-nowrap text-[11px] font-display text-muted-foreground tracking-tight leading-none">
      {label}<span className="text-foreground font-bold tabular-nums">{value}</span>
    </p>
  </div>
);

export default TimeLeftBadge;
