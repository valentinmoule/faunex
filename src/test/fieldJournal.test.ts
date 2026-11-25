import { describe, it, expect } from 'vitest';
import { computeJournalStats } from '@/lib/fieldJournal';

const c = (d: string, name = 'Renard', loc: string | null = 'Lyon') => ({ animal_name: name, category: 'Mammifères', rarity: 'common', location: loc, created_at: `${d}T10:00:00` });

describe('field journal stats', () => {
  it('counts the longest run of consecutive capture days', () => {
    const s = computeJournalStats([c('2026-11-01'), c('2026-11-02'), c('2026-11-03'), c('2026-11-10')], new Date(2026, 10, 25));
    expect(s.longestStreak).toBe(3);
    expect(s.activeDays).toBe(4);
  });
  it('counts distinct species and places', () => {
    const s = computeJournalStats([c('2026-11-01', 'Renard'), c('2026-11-02', 'renard', 'Paris'), c('2026-11-02', 'Mésange', null)], new Date(2026, 10, 25));
    expect(s.species).toBe(2);
    expect(s.places).toBe(2);
  });
});
