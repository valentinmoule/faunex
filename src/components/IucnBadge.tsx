/**
 * Statut de conservation UICN (Liste rouge mondiale).
 *
 * Volontairement distinct du jeton de rareté : la rareté Faunex mesure la
 * difficulté d'observation, l'UICN mesure le risque d'extinction.
 */
export type IucnStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';

export const IUCN_LABELS: Record<IucnStatus, string> = {
  LC: 'Préoccupation mineure',
  NT: 'Quasi menacée',
  VU: 'Vulnérable',
  EN: 'En danger',
  CR: 'En danger critique',
  EW: 'Éteinte à l’état sauvage',
  EX: 'Éteinte',
  DD: 'Données insuffisantes',
  NE: 'Non évaluée',
};

const TONE: Record<IucnStatus, string> = {
  LC: 'text-primary bg-primary/8 ring-primary/20',
  NT: 'text-forest-light bg-forest-light/8 ring-forest-light/20',
  VU: 'text-amber bg-amber/8 ring-amber/25',
  EN: 'text-destructive bg-destructive/8 ring-destructive/20',
  CR: 'text-destructive bg-destructive/12 ring-destructive/30',
  EW: 'text-foreground bg-muted ring-border',
  EX: 'text-foreground bg-muted ring-border',
  DD: 'text-muted-foreground bg-muted ring-border',
  NE: 'text-muted-foreground bg-muted ring-border',
};

export const isIucnStatus = (value?: string | null): value is IucnStatus =>
  !!value && value in IUCN_LABELS;

const IucnBadge = ({ status, className }: { status?: string | null; className?: string }) => {
  if (!isIucnStatus(status)) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${TONE[status]} ${className ?? ''}`}
      title={`Liste rouge UICN : ${IUCN_LABELS[status]}`}
    >
      <span className="font-display text-[10px] font-bold tracking-wide">{status}</span>
      <span className="text-[10px] font-medium opacity-80">{IUCN_LABELS[status]}</span>
    </span>
  );
};

export default IucnBadge;
