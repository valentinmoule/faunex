import type { Rarity } from '@/data/mockData';

export interface AnimalResult {
  animal_name: string;
  scientific_name: string;
  category: string;
  description: string;
  habitat: string;
  diet: string;
  conservation: string;
  fun_fact: string;
  rarity: Rarity;
  confidence?: number;
  alternatives?: string[];
  alternatives_scientific?: string[] | null;
  /** Rang taxonomique réellement atteint (species, genus, family…). */
  scientific_rank?: string;
  /** true uniquement si le taxon a été confirmé dans un référentiel fiable. */
  taxon_validated?: boolean;
  subject_bbox?: { x: number; y: number; w: number; h: number } | null;
  economy_validation_id?: string;
  analyzed_image?: string;
  economy_crop?: { x: number; y: number; width: number; height: number };
}

export interface GeoTag {
  coords: { lat: number; lng: number } | null;
  name: string | null;
}
