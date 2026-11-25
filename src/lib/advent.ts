import type { ThemedCollection } from './themedCollections';

export type AdventKind = 'photo' | 'gift' | 'quiz' | 'badge';
export interface AdventChallenge { day: number; kind?: AdventKind; title: string; title_en: string; categories: string[]; xp: number; options?: string[]; options_en?: string[] }
export const adventKind = (d: AdventChallenge): AdventKind => d.kind ?? 'photo';
export interface AdventCalendar extends ThemedCollection { event_kind: 'advent'; calendar_year: number; calendar_days: AdventChallenge[]; final_badge_xp: number }
export interface AdventSubmission { id: string; collection_id: string; day: number; image_url: string; approved_at: string | null; claimed_at: string | null }
export type AdventState = 'locked' | 'today' | 'catchup' | 'pending' | 'missed' | 'complete' | 'claimed';
export const ADVENT_CATEGORIES = ['Mammifères', 'Oiseaux', 'Reptiles', 'Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Crustacés', 'Mollusques', 'Échinodermes', 'Cnidaires', 'Autres invertébrés'];
import defaults from './adventDefaultDays.json';
// Winter layout: photo challenges with realistic December categories, 4 gifts, 4 quizzes, badge on the 24th.
export const defaultAdventDays = (): AdventChallenge[] => (defaults as AdventChallenge[]).map(d => ({ ...d }));
export const adventStart = (year: number, day: number) => new Date(Date.UTC(year, 11, day, -1));
export const canOpenAdvent = (year: number, now: Date) => now >= adventStart(year, 1);
export const adventCountdown = (year: number, now: Date) => {
  const ms = Math.max(0, adventStart(year, 1).getTime() - now.getTime());
  return { days: Math.floor(ms / 86400000), hours: Math.floor(ms / 3600000) % 24, minutes: Math.floor(ms / 60000) % 60 };
};
export function adventState(year: number, day: number, now: Date, submissions: AdventSubmission[]): AdventState {
  const own = submissions.filter(s => s.day === day);
  if (own.some(s => s.claimed_at)) return 'claimed';
  if (own.some(s => s.approved_at)) return 'complete';
  if (own.length) return 'pending';
  const start = adventStart(year, day).getTime();
  if (now.getTime() < start) return 'locked';
  if (now.getTime() < start + 86400000) return 'today';
  // Catch-up stays open until the end of December 24.
  return now.getTime() < adventStart(year, 24).getTime() + 86400000 ? 'catchup' : 'missed';
}