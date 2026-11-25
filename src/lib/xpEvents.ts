/** Signale qu'une récompense a modifié l'XP : les jauges de niveau se rafraîchissent. */
export const XP_CHANGED = 'faunex:xp-changed';
export const notifyXpChanged = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(XP_CHANGED)); };
