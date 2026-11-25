export interface JournalCapture { animal_name: string; category: string | null; rarity: string | null; location: string | null; created_at: string }

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const count = (arr: string[]) => Object.entries(arr.reduce<Record<string, number>>((a, k) => { a[k] = (a[k] ?? 0) + 1; return a; }, {}))
  .map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count);

/** Statistiques du carnet de terrain, calculées depuis les captures approuvées. */
export function computeJournalStats(rows: JournalCapture[], now = new Date()) {
  const days = new Set(rows.map((r) => dayKey(new Date(r.created_at))));
  const sorted = [...days].sort();
  let longestStreak = 0, run = 0, prev: number | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split('-').map(Number);
    const t = Date.UTC(y, m - 1, d) / 86_400_000;
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run); prev = t;
  }
  const perDay = rows.reduce<Record<string, number>>((a, r) => { const k = dayKey(new Date(r.created_at)); a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 83);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const heat: { date: string; count: number }[] = [];
  for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) { const k = dayKey(d); heat.push({ date: k, count: perDay[k] ?? 0 }); }
  const months = count(rows.map((r) => r.created_at.slice(0, 7)));
  return {
    total: rows.length,
    species: new Set(rows.map((r) => r.animal_name.toLowerCase())).size,
    places: new Set(rows.map((r) => r.location?.trim()).filter(Boolean)).size,
    activeDays: days.size,
    longestStreak,
    bestMonth: months[0] ?? null,
    heat,
    categories: count(rows.map((r) => r.category || 'Autres')),
    rarities: rows.reduce<Record<string, number>>((a, r) => { const k = r.rarity || 'common'; a[k] = (a[k] ?? 0) + 1; return a; }, {}),
    topPlaces: count(rows.map((r) => r.location?.trim() ?? '').filter(Boolean)).slice(0, 5),
  };
}
