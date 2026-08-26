/**
 * Ligues hebdomadaires globales (indépendantes des classements par catégorie).
 * Un utilisateur appartient à un seul palier à la fois.
 */

export interface LeagueTier {
  tier: number;
  label: string;
  emoji: string;
  /** Classe de texte pour le nom du palier */
  text: string;
  /** Fond doux pour le bandeau / la pastille */
  bg: string;
  /** Bordure assortie */
  border: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { tier: 0, label: 'Débutant', emoji: '🌱', text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/25' },
  { tier: 1, label: 'Bronze', emoji: '🥉', text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/25' },
  { tier: 2, label: 'Argent', emoji: '🥈', text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
  { tier: 3, label: 'Or', emoji: '🥇', text: 'text-rarity-mythic', bg: 'bg-rarity-mythic/10', border: 'border-rarity-mythic/25' },
  { tier: 4, label: 'Platine', emoji: '💎', text: 'text-sky', bg: 'bg-sky/10', border: 'border-sky/25' },
  { tier: 5, label: 'Diamant', emoji: '💠', text: 'text-rarity-rare', bg: 'bg-rarity-rare/10', border: 'border-rarity-rare/25' },
  { tier: 6, label: 'Élite', emoji: '👑', text: 'text-rarity-epic', bg: 'bg-rarity-epic/10', border: 'border-rarity-epic/25' },
];

export const leagueTier = (tier: number | null | undefined): LeagueTier =>
  LEAGUE_TIERS[Math.min(Math.max(tier ?? 0, 0), LEAGUE_TIERS.length - 1)];

/** Nombre de joueurs promus en haut de groupe */
export const PROMOTION_SLOTS = 5;
/** Nombre de joueurs relégués en bas de groupe (à partir de 10 joueurs) */
export const DEMOTION_SLOTS = 5;
export const MIN_SIZE_FOR_DEMOTION = 10;

export type LeagueZone = 'promotion' | 'stay' | 'demotion';

export const leagueZone = (rank: number, size: number, tier: number): LeagueZone => {
  if (rank <= PROMOTION_SLOTS && tier < 6) return 'promotion';
  if (size >= MIN_SIZE_FOR_DEMOTION && rank > size - DEMOTION_SLOTS && tier > 0) return 'demotion';
  return 'stay';
};

export const OUTCOME_LABEL: Record<string, string> = {
  promoted: 'Tu es monté de ligue 🎉',
  stayed: 'Tu restes dans ta ligue',
  demoted: 'Tu es descendu de ligue',
};

/** Temps restant avant la clôture hebdomadaire (dimanche minuit, heure locale). */
export const timeUntilWeekEnd = (now: Date = new Date()): string => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = end.getDay(); // 0 = dimanche
  const daysLeft = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + daysLeft + 1);
  const ms = end.getTime() - now.getTime();
  const totalHours = Math.max(0, Math.floor(ms / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days} j ${hours} h`;
  const minutes = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  return `${hours} h ${minutes} min`;
};
