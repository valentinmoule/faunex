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
  subject_bbox?: { x: number; y: number; w: number; h: number } | null;
}

export interface GeoTag {
  coords: { lat: number; lng: number } | null;
  name: string | null;
}
