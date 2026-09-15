import { supabase } from '@/integrations/supabase/client';

/**
 * Pages publiques d'espèces (`/especes/<slug>`), destinées au référencement.
 *
 * Le contenu bilingue est pré-généré côté serveur et stocké dans `species_pages`
 * (table publique en lecture) : aucun appel IA à l'affichage.
 */

export type SpeciesLocale = 'fr' | 'en';

export interface SpeciesSections {
  /** Nom commun localisé (le nom de la table reste en français). */
  name: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  recognize: string;
  where: string;
  when: string;
  diet: string;
  behaviour: string;
  tracks: string;
  similar: string;
  conservation: string;
  funFact: string;
}

export interface SpeciesPage {
  slug: string;
  animal_name: string;
  scientific_name: string | null;
  category: string | null;
  rarity: string | null;
  iucn_status: string | null;
  capture_count: number;
  updated_at: string;
  content: Partial<Record<SpeciesLocale, Partial<SpeciesSections>>>;
}

export interface SpeciesPageSummary {
  slug: string;
  animal_name: string;
  content?: Partial<Record<SpeciesLocale, Partial<SpeciesSections>>>;
  scientific_name: string | null;
  category: string | null;
  rarity: string | null;
  capture_count: number;
}

export const speciesLocale = (locale: string | undefined): SpeciesLocale =>
  locale?.toLowerCase().startsWith('en') ? 'en' : 'fr';

/** Sections de la page dans la langue demandée, avec repli sur le français. */
export const localizedSections = (
  page: SpeciesPage,
  locale: string | undefined,
): Partial<SpeciesSections> => {
  const lang = speciesLocale(locale);
  const wanted = page.content?.[lang];
  if (wanted?.intro) return wanted;
  return page.content?.fr ?? wanted ?? {};
};

/** Nom commun affichable dans la langue courante (repli : nom français). */
export const localizedSpeciesName = (
  page: { animal_name: string; content?: Partial<Record<SpeciesLocale, Partial<SpeciesSections>>> },
  locale: string | undefined,
): string => page.content?.[speciesLocale(locale)]?.name || page.animal_name;

export async function fetchSpeciesPage(slug: string): Promise<SpeciesPage | null> {
  const { data, error } = await supabase
    .from('species_pages')
    .select('slug, animal_name, scientific_name, category, rarity, iucn_status, capture_count, updated_at, content')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) throw error;
  return (data as SpeciesPage | null) ?? null;
}

/** Nom commun affichable dans la langue courante (repli : nom français). */
export const localizedSpeciesName = (
  page: { animal_name: string; content?: Partial<Record<SpeciesLocale, Partial<SpeciesSections>>> },
  locale: string | undefined,
): string => page.content?.[speciesLocale(locale)]?.name || page.animal_name;

export async function fetchSpeciesPages(): Promise<SpeciesPageSummary[]> {
  const { data, error } = await supabase
    .from('species_pages')
    .select('slug, animal_name, scientific_name, category, rarity, capture_count, content')
    .eq('published', true)
    .order('capture_count', { ascending: false });
  if (error) throw error;
  return (data as SpeciesPageSummary[]) ?? [];
}
