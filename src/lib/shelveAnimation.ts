import type { Rarity } from '@/data/mockData';
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
  scientificName?: string | null;
  category: string;
  rarity: Rarity;
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

/* ── Coordination avec les autres célébrations (montée de niveau…) ── */
let shelveRunning = false;

export const setShelveRunning = (running: boolean) => {
  shelveRunning = running;
};

/** Un rangement est prévu ou en cours. */
export const isShelveBusy = () => shelveRunning || peekPendingShelve() !== null;

/**
 * Résout quand aucun rangement de carte n'est prévu ni en cours.
 * Petit délai initial : l'XP peut arriver avant que la capture ne programme
 * son rangement. Plafond de sécurité à 35 s.
 */
export const waitForShelveIdle = (initialDelay = 1500): Promise<void> =>
  new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (!isShelveBusy() || Date.now() - start > 35_000) resolve();
      else window.setTimeout(tick, 250);
    };
    window.setTimeout(tick, initialDelay);
  });
