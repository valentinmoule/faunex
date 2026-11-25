import type { ComponentType, SVGProps } from 'react';
import { Bird, Bug, Fish, Rabbit, Search, Snail } from 'lucide-react';

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Lizard = (p: P) => <svg {...base} {...p}><path d="M12 3c1.7 0 2.5 1.3 2.5 2.8 0 1.6-1 2.6-1 4.2v3.5c0 2 1.2 3.2 2.8 4.2 1.5 1 2.2 2.3 1.2 3.3" /><path d="M12 3c-1.7 0-2.5 1.3-2.5 2.8 0 1.6 1 2.6 1 4.2v4" /><path d="M10.5 9 7 7.5M13.5 9 17 7.5M10.5 14 7 16M13.5 14 17 15.5" /></svg>;
export const Frog = (p: P) => <svg {...base} {...p}><circle cx="8" cy="7" r="2.5" /><circle cx="16" cy="7" r="2.5" /><path d="M5.6 8.2C4 9.7 3 11.8 3 14c0 3.3 4 6 9 6s9-2.7 9-6c0-2.2-1-4.3-2.6-5.8" /><path d="M9 14.5c1.8 1.2 4.2 1.2 6 0" /></svg>;
export const Spider = (p: P) => <svg {...base} {...p}><circle cx="12" cy="9" r="2.5" /><ellipse cx="12" cy="15.5" rx="3" ry="4" /><path d="M9.5 8 6 4 3 5M14.5 8 18 4l3 1M9.3 12 4 10l-2 2M14.7 12 20 10l2 2M9.2 15H4l-2 3M14.8 15H20l2 3M9.7 18 6 21M14.3 18l3.7 3" /></svg>;
export const Crab = (p: P) => <svg {...base} {...p}><path d="M5 13c0 3 3.1 5 7 5s7-2 7-5-3.1-4-7-4-7 1-7 4Z" /><path d="M7 10 5 6.5M17 10l2-3.5" /><path d="M5 6.5C3 6 2.5 4 3.5 3c.5 1 1.5 1.3 2.5 1M19 6.5c2-.5 2.5-2.5 1.5-3.5-.5 1-1.5 1.3-2.5 1" /><path d="M6 16 3 18M18 16l3 2M7.5 17.5 6 21M16.5 17.5 18 21" /></svg>;


export type CategoryIconType = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: string | number }>;

/** Icône de trait unique d'une grande catégorie d'espèces, partagée par toute l'app. */
export function categoryLineIcon(category: string): CategoryIconType {
  const cat = (category || '').toLowerCase();
  if (cat.includes('oiseau')) return Bird as CategoryIconType;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish as CategoryIconType;
  if (cat.includes('arachnide')) return Spider;
  if (cat.includes('insecte')) return Bug as CategoryIconType;
  if (cat.includes('reptile')) return Lizard;
  if (cat.includes('amphibien')) return Frog;
  if (cat.includes('crustac')) return Crab;
  if (cat.includes('mollusque')) return Snail as CategoryIconType;
  if (cat.includes('mammif')) return Rabbit as CategoryIconType;
  return Search as CategoryIconType;
}
