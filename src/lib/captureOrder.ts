/**
 * Ordre personnalisé des captures : les captures classées par l'utilisateur
 * d'abord (dans son ordre), les nouvelles non classées en tête du reste,
 * triées de la plus récente à la plus ancienne.
 */
export const applyCustomCaptureOrder = <T extends { id: string; discoveredAt?: string }>(
  list: T[],
  customOrder: string[],
): T[] => {
  if (customOrder.length === 0) return list;
  const rank = new Map(customOrder.map((id, i) => [id, i]));
  return list.sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra === undefined && rb === undefined) {
      return +new Date(b.discoveredAt || 0) - +new Date(a.discoveredAt || 0);
    }
    if (ra === undefined) return -1; // nouvelles captures en tête
    if (rb === undefined) return 1;
    return ra - rb;
  });
};

/** Extrait une liste d'ids depuis la colonne jsonb stockée en base. */
export const parseCaptureOrder = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
