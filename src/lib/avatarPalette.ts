import type { CSSProperties } from 'react';

/** Nombre de teintes du nuancier d'avatar (tokens --avatar-N dans index.css). */
const AVATAR_TONES = 9;

/**
 * Teinte d'avatar d'un explorateur : déterministe (un même pseudo ou prénom
 * donne toujours la même couleur) et répartie sur tout le nuancier.
 */
export const avatarColorVar = (seed?: string | null): string => {
  const key = (seed ?? '').trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `var(--avatar-${(hash >>> 0) % AVATAR_TONES + 1})`;
};

/** Fond teinté + initiale (et liseré assorti en option) d'un avatar sans photo. */
export const avatarFallbackStyle = (
  seed?: string | null,
  opts?: { border?: boolean },
): CSSProperties => {
  const tone = avatarColorVar(seed);
  const style: CSSProperties = {
    backgroundColor: `hsl(${tone} / 0.16)`,
    color: `hsl(${tone})`,
  };
  if (opts?.border) style.borderColor = `hsl(${tone} / 0.35)`;
  return style;
};
