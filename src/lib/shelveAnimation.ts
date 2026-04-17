/**
 * Helpers to coordinate the "card shelving into the bestiary binder" animation
 * across the Capture → Bestiaire navigation.
 *
 * The Capture page stores the just-captured animal info, then navigates to
 * /bestiaire. The Bestiaire page reads it on mount, opens the right category,
 * scrolls to the slot, and plays a glide+flash animation.
 */

const STORAGE_KEY = 'faunex:pending-shelve';

export interface PendingShelve {
  animalName: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'mythic';
  imageUrl: string;
  /** epoch ms — used to expire stale entries */
  ts: number;
}

export const setPendingShelve = (data: Omit<PendingShelve, 'ts'>) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, ts: Date.now() }),
    );
  } catch {
    // ignore (private mode etc.)
  }
};

export const consumePendingShelve = (): PendingShelve | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as PendingShelve;
    // Expire entries older than 30s — protects against stale state
    if (!parsed.ts || Date.now() - parsed.ts > 30_000) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const peekPendingShelve = (): PendingShelve | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingShelve;
    if (!parsed.ts || Date.now() - parsed.ts > 30_000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
