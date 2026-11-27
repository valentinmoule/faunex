import { isBeeGroupLabel } from './visual-identification-policy.ts';

// First reclassification wave. Keep these names/taxa in sync with SQL
// is_reclassification_group_label; genuine species and domestic breeds are not groups.
const GROUP_NAMES = new Set(['fourmi', 'fourmi ailee', 'araignee', 'araignee commune', 'mouche', 'mouche commune']);
const GROUP_TAXA = new Set(['formicidae', 'araneae', 'brachycera', 'muscidae']);
const fold = (value: unknown) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();

export function isReclassificationGroupLabel(name: unknown, scientific: unknown): boolean {
  if (GROUP_NAMES.has(fold(name))) return true;
  const sci = String(scientific ?? '').toLowerCase().trim().split(/\s+/);
  return GROUP_TAXA.has(sci[0]) && (sci.length === 1 || /^spp?\.?$/.test(sci[1]));
}

export function isNonCollectibleGroupLabel(name: unknown, scientific: unknown): boolean {
  return isBeeGroupLabel(name, scientific) || isReclassificationGroupLabel(name, scientific);
}

export const RECLASSIFICATION_SPECIES_RULE = `FOURMIS, ARAIGNÉES ET MOUCHES : « Fourmi », « Fourmi ailée », « Araignée », « Araignée commune », « Mouche » et « Mouche commune » désignent des groupes, jamais des fiches d'espèces. Affine uniquement grâce aux caractères diagnostiques réellement visibles. Ne choisis jamais l'espèce la plus courante par défaut ni dans une liste fermée d'espèces françaises : les photos peuvent venir du monde entier. Si l'espèce ne peut pas être distinguée, conserve honnêtement le rang supérieur sûr ; la photo sera proposée en modération, sans fiche générique ni binôme inventé.`;