/**
 * Médaillon de badge : pin émaillé 3D façon badge de ligue.
 *
 * Écusson hexagonal avec bord métallique épais, corps en émail dégradé,
 * reflet brillant et ombre portée — inspiré des pins Pokémon / Duolingo.
 * Les couleurs viennent uniquement des tokens du design system.
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
  const claimable = state === 'claimable';
  const rim = Math.max(4, size * 0.09);

  return (
    <div
      className={`relative shrink-0 ${className} ${state === 'claimed' ? 'badge-icon-float' : ''}`}
      style={{
        width: size,
        height: size,
        filter: locked
          ? 'none'
          : `drop-shadow(0 ${Math.max(3, size * 0.08)}px ${Math.max(5, size * 0.14)}px hsl(var(${hue.to}) / 0.35))`,
      }}
    >
      {/* Halo pulsant derrière le pin quand il est à réclamer */}
      {claimable && (
        <div
          className="absolute -inset-2 animate-pulse blur-lg"
          style={{
            clipPath: HEX,
            background: `hsl(var(${hue.from}) / 0.45)`,
          }}
        />
      )}

      {/* Bord extérieur 3D (métal sombre) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: HEX,
          background: locked
            ? 'hsl(var(--muted-foreground) / 0.35)'
            : `linear-gradient(160deg, hsl(var(${hue.to}) / 0.55) 0%, hsl(var(${hue.from})) 45%, hsl(var(${hue.to})) 100%)`,
        }}
      />

      {/* Corps émaillé */}
      <div
        className="absolute overflow-hidden"
        style={{
          inset: rim,
          clipPath: HEX,
          background: locked
            ? 'linear-gradient(160deg, hsl(var(--muted)), hsl(var(--muted) / 0.75))'
            : `linear-gradient(150deg, hsl(var(${hue.from}) / 0.85) 0%, hsl(var(${hue.from})) 40%, hsl(var(${hue.to})) 100%)`,
          boxShadow: locked
            ? 'none'
            : `inset 0 ${Math.max(1, size * 0.03)}px ${Math.max(3, size * 0.08)}px hsl(0 0% 100% / 0.35), inset 0 -${Math.max(2, size * 0.04)}px ${Math.max(4, size * 0.1)}px hsl(var(${hue.to}) / 0.6)`,
        }}
      >
        {/* Reflet brillant diagonal (gloss) */}
        {!locked && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, hsl(0 0% 100% / 0.5) 0%, hsl(0 0% 100% / 0.12) 28%, transparent 45%)',
            }}
          />
        )}
        {/* Voile de profondeur en bas */}
        {!locked && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(0deg, hsl(0 0% 0% / 0.18) 0%, transparent 40%)',
            }}
          />
        )}
      </div>

      {/* Icône */}
      <div className="absolute inset-0 flex items-center justify-center">
        {BADGE_ICONS[badgeId] || !fallbackEmoji ? (
          <Icon
            strokeWidth={2.4}
            style={{
              width: size * 0.42,
              height: size * 0.42,
              filter: locked ? 'none' : 'drop-shadow(0 1px 2px hsl(0 0% 0% / 0.35))',
            }}
            className={locked ? 'text-muted-foreground/70' : 'text-primary-foreground'}
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
