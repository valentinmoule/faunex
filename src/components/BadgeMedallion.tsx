/**
 * Médaillon de badge : écusson hexagonal avec dégradé + icône vectorielle.
 *
 * Remplace les emojis par des icônes singulières (lucide) et un blason
 * coloré selon la famille du badge. Les couleurs viennent uniquement des
 * tokens du design system (`--primary`, `--amber`, `--rarity-*`…).
 */

import {
  Award, Bird, Bug, Cat, Compass, Crown, Diamond, Flame, Fish, Footprints, Gem,
  Globe2, Handshake, Leaf, Library, MapPin, Medal, Megaphone, Microscope, Moon,
  Mountain, Radar, Rat, Search, Shell, Sparkles, Sprout, Star, Sun, Trophy,
  Users, Waves, Camera, Dna, BarChart3, Map as MapIcon, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { BadgeGroup } from '@/lib/badges';

export type BadgeMedallionState = 'locked' | 'claimable' | 'claimed';

/** Icône vectorielle dédiée par badge (fallback par famille si absent). */
const BADGE_ICONS: Record<string, LucideIcon> = {
  first_capture: Camera,
  explorer_10: Compass,
  explorer_25: Sprout,
  explorer_50: Microscope,
  explorer_100: Library,
  level_5: Medal,
  level_10: Award,
  regions_3: MapIcon,
  regions_10: Globe2,
  geo_10: MapPin,
  night_owl: Moon,
  early_bird: Sun,

  birds_5: Bird,
  mammals_5: Cat,
  insects_5: Bug,
  reptiles_3: Waves,
  amphibians_3: Leaf,
  fishes_3: Fish,
  arachnids_3: Radar,
  molluscs_3: Shell,
  crustaceans_3: Mountain,
  categories_all: Dna,

  rare_1: Diamond,
  rare_10: Search,
  legendary_1: Star,
  legendary_5: Sparkles,
  mythic_1: Flame,
  mythic_3: Gem,

  podium_any: Medal,
  top10_any: BarChart3,

  social_3: Handshake,
  social_10: Megaphone,
  followers_5: Users,
  followers_25: Crown,
  community_discord: ShieldCheck,
};

const GROUP_FALLBACK: Record<BadgeGroup, LucideIcon> = {
  progression: Compass,
  especes: Footprints,
  rarete: Gem,
  collections: Library,
  classement: Trophy,
  social: Users,
};

/** Teinte du blason par famille (token HSL du design system). */
export const GROUP_HUE: Record<BadgeGroup, { from: string; to: string }> = {
  progression: { from: '--primary', to: '--rarity-uncommon' },
  especes: { from: '--accent', to: '--primary' },
  rarete: { from: '--rarity-rare', to: '--rarity-very-rare' },
  collections: { from: '--rarity-very-rare', to: '--sky' },
  classement: { from: '--amber', to: '--amber-dark' },
  social: { from: '--sky', to: '--rarity-rare' },
};

const HEX = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

interface Props {
  badgeId: string;
  group: BadgeGroup;
  /** Emoji d'origine, utilisé pour les badges dynamiques sans icône dédiée. */
  fallbackEmoji?: string;
  state: BadgeMedallionState;
  /** Diamètre du médaillon en px. */
  size?: number;
  className?: string;
}

const BadgeMedallion = ({ badgeId, group, fallbackEmoji, state, size = 62, className = '' }: Props) => {
  const Icon =
    BADGE_ICONS[badgeId] ??
    (badgeId.startsWith('collection_')
      ? Library
      : badgeId.startsWith('rank1_')
      ? Trophy
      : GROUP_FALLBACK[group]);

  const hue = GROUP_HUE[group];
  const locked = state === 'locked';

  return (
    <div
      className={`relative shrink-0 ${className} ${state === 'claimed' ? 'badge-icon-float' : ''}`}
      style={{ width: size, height: size }}
    >
      {/* Halo */}
      {!locked && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ background: `hsl(var(${hue.from}) / 0.55)` }}
        />
      )}

      {/* Contour hexagonal */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: HEX,
          background: locked
            ? 'hsl(var(--muted-foreground) / 0.28)'
            : `linear-gradient(155deg, hsl(var(${hue.from}) / 0.95), hsl(var(${hue.to}) / 0.95))`,
        }}
      />

      {/* Cœur du blason */}
      <div
        className="absolute"
        style={{
          inset: Math.max(3, size * 0.075),
          clipPath: HEX,
          background: locked
            ? 'linear-gradient(160deg, hsl(var(--muted)), hsl(var(--muted) / 0.7))'
            : `linear-gradient(160deg, hsl(var(${hue.from})), hsl(var(${hue.to})))`,
        }}
      />

      {/* Reflet supérieur */}
      <div
        className="absolute opacity-40"
        style={{
          inset: Math.max(3, size * 0.075),
          clipPath: HEX,
          background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.55), transparent 55%)',
        }}
      />

      {/* Icône */}
      <div className="absolute inset-0 flex items-center justify-center">
        {BADGE_ICONS[badgeId] || !fallbackEmoji ? (
          <Icon
            strokeWidth={2.2}
            style={{ width: size * 0.4, height: size * 0.4 }}
            className={locked ? 'text-muted-foreground' : 'text-primary-foreground drop-shadow'}
          />
        ) : (
          <span
            style={{ fontSize: size * 0.36 }}
            className={locked ? 'grayscale opacity-50' : 'drop-shadow'}
          >
            {fallbackEmoji}
          </span>
        )}
      </div>
    </div>
  );
};

export default BadgeMedallion;
