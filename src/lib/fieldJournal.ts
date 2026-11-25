export interface JournalCapture { animal_name: string; category: string | null; rarity: string | null; location: string | null; created_at: string; image_url?: string | null }

export const RARITY_RANK = ['common', 'uncommon', 'rare', 'very_rare', 'ultra_rare', 'illustration_rare', 'special_rare', 'hyper_rare'];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dayNum = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
const count = (arr: string[]) => Object.entries(arr.reduce<Record<string, number>>((a, k) => { a[k] = (a[k] ?? 0) + 1; return a; }, {}))
  .map(([key, n]) => ({ key, count: n })).sort((a, b) => b.count - a.count);

/** Statistiques du carnet de terrain, calculées depuis les captures approuvées. */
export function computeJournalStats(rows: JournalCapture[], now = new Date()) {
  const sortedRows = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const days = new Set(sortedRows.map((r) => dayKey(new Date(r.created_at))));
  const sorted = [...days].sort();
  let longestStreak = 0, run = 0, prev: number | null = null;
  for (const k of sorted) {
    const t = dayNum(k);
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run); prev = t;
  }
  // Série en cours : jours consécutifs jusqu'à aujourd'hui (ou hier).
  let currentStreak = 0;
  const today = dayNum(dayKey(now));
  if (prev !== null && today - prev <= 1) currentStreak = run;

  const perDay = sortedRows.reduce<Record<string, number>>((a, r) => { const k = dayKey(new Date(r.created_at)); a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * 26 + 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const heat: { date: string; count: number }[] = [];
  for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) { const k = dayKey(d); heat.push({ date: k, count: perDay[k] ?? 0 }); }

  // Premières observations de chaque espèce = nouvelles espèces.
  const firstSeen = new Map<string, JournalCapture>();
  for (const r of sortedRows) { const k = r.animal_name.toLowerCase(); if (!firstSeen.has(k)) firstSeen.set(k, r); }

  // 6 derniers mois : captures et nouvelles espèces.
  const months: { key: string; captures: number; newSpecies: number }[] = [];
  for (let i = 5; i >= 0; i--) months.push({ key: monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), captures: 0, newSpecies: 0 });
  const mIdx = new Map(months.map((m, i) => [m.key, i]));
  for (const r of sortedRows) { const i = mIdx.get(r.created_at.slice(0, 7)); if (i !== undefined) months[i].captures++; }
  for (const r of firstSeen.values()) { const i = mIdx.get(r.created_at.slice(0, 7)); if (i !== undefined) months[i].newSpecies++; }
  const thisMonth = months[5], lastMonth = months[4];
  const monthDays = (key: string) => [...days].filter((d) => d.startsWith(key)).length;

  // Journée record : le plus d'espèces différentes en un jour.
  const speciesPerDay = new Map<string, Set<string>>();
  for (const r of sortedRows) { const k = dayKey(new Date(r.created_at)); if (!speciesPerDay.has(k)) speciesPerDay.set(k, new Set()); speciesPerDay.get(k)!.add(r.animal_name.toLowerCase()); }
  let bestDay: { date: string; species: number } | null = null;
  for (const [date, set] of speciesPerDay) if (!bestDay || set.size > bestDay.species) bestDay = { date, species: set.size };

  // Trouvaille la plus rare (la plus ancienne à rareté égale).
  let rarest: JournalCapture | null = null;
  for (const r of sortedRows) if (!rarest || RARITY_RANK.indexOf(r.rarity ?? 'common') > RARITY_RANK.indexOf(rarest.rarity ?? 'common')) rarest = r;

  const speciesCount = firstSeen.size;
  const categories = count([...firstSeen.values()].map((r) => r.category || 'Autres'));
  const monthsCount = count(sortedRows.map((r) => r.created_at.slice(0, 7)));
  const placeSpecies = new Map<string, Set<string>>();
  for (const r of sortedRows) { const p = r.location?.trim(); if (!p) continue; if (!placeSpecies.has(p)) placeSpecies.set(p, new Set()); placeSpecies.get(p)!.add(r.animal_name.toLowerCase()); }

  return {
    total: rows.length,
    species: speciesCount,
    places: placeSpecies.size,
    activeDays: days.size,
    longestStreak,
    currentStreak,
    bestMonth: monthsCount[0] ?? null,
    bestDay,
    rarest,
    heat,
    months,
    thisMonth: { ...thisMonth, days: monthDays(thisMonth.key) },
    lastMonth: { ...lastMonth, days: monthDays(lastMonth.key) },
    /** Catégories comptées en espèces distinctes. */
    categories,
    rarities: rows.reduce<Record<string, number>>((a, r) => { const k = r.rarity || 'common'; a[k] = (a[k] ?? 0) + 1; return a; }, {}),
    topPlaces: [...placeSpecies.entries()].map(([key, set]) => ({ key, count: set.size, captures: sortedRows.filter((r) => r.location?.trim() === key).length }))
      .sort((a, b) => b.count - a.count || b.captures - a.captures).slice(0, 5),
  };
}
