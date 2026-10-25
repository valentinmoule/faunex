import type { ThemedCollection } from './themedCollections';

export interface AdventChallenge { day: number; title: string; title_en: string; categories: string[]; xp: number }
export interface AdventCalendar extends ThemedCollection { event_kind: 'advent'; calendar_year: number; calendar_days: AdventChallenge[]; final_badge_xp: number }
export interface AdventSubmission { id: string; collection_id: string; day: number; image_url: string; approved_at: string | null; claimed_at: string | null }
export type AdventState = 'locked' | 'today' | 'pending' | 'missed' | 'complete' | 'claimed';
export const ADVENT_CATEGORIES = ['Mammifères', 'Oiseaux', 'Reptiles', 'Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Crustacés', 'Mollusques', 'Échinodermes', 'Cnidaires', 'Autres invertébrés'];
const proposed = [[0],[1],[5],[8],[4],[0,1],[6],[1],[0],[5,6],[4,7],[],[8],[1],[0],[5],[2,3,4],[1,0],[6,8],[4],[5,7],[0],[1],[]];
const enCategories = ['mammal','bird','reptile','amphibian','fish','insect','arachnid','crustacean','mollusc','echinoderm','cnidarian','other invertebrate'];
export const defaultAdventDays = (): AdventChallenge[] => proposed.map((indices, i) => ({ day: i + 1, categories: indices.map(j => ADVENT_CATEGORIES[j]), title: indices.length ? `Trouver : ${indices.map(j => ADVENT_CATEGORIES[j]).join(' ou ')}` : 'Trouver un animal de n’importe quelle catégorie', title_en: indices.length ? `Find a ${indices.map(j => enCategories[j]).join(' or ')}` : 'Find an animal of any category', xp: 50 }));
export const adventStart = (year: number, day: number) => new Date(Date.UTC(year, 11, day, -1));
export const canOpenAdvent = (year: number, now: Date) => now >= adventStart(year, 1);
export function adventState(year: number, day: number, now: Date, submissions: AdventSubmission[]): AdventState {
  const own = submissions.filter(s => s.day === day);
  if (own.some(s => s.claimed_at)) return 'claimed';
  if (own.some(s => s.approved_at)) return 'complete';
  if (own.length) return 'pending';
  const start = adventStart(year, day).getTime();
  if (now.getTime() < start) return 'locked';
  return now.getTime() < start + 86400000 ? 'today' : 'missed';
}