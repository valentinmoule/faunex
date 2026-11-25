import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { normalizeCategory } from '@/lib/bestiary';

const TONES: Record<string, string> = { Mammifères: '--chip-mammal', Oiseaux: '--chip-bird', Insectes: '--chip-insect', Reptiles: '--chip-reptile', Amphibiens: '--chip-amphibian', Poissons: '--chip-fish', Arachnides: '--chip-arachnid', Crustacés: '--chip-crustacean', Mollusques: '--chip-mollusc' };

/** Pastille ronde à icône pour une grande catégorie d'espèces (remplit son conteneur). */
export default function CategoryChipIcon({ category }: { category: string }) {
  const Icon = categoryLineIcon(category); const tone = TONES[normalizeCategory(category)] ?? '--chip-other';
  return <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `hsl(var(${tone}))` }}>
    <Icon className="h-8 w-8 text-foreground" strokeWidth={2} aria-hidden />
  </span>;
}
