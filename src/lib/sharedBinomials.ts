/**
 * Binômes scientifiques partagés par de multiples races domestiques.
 * Source unique partagée avec les fonctions serveur : un même nom scientifique
 * n'est jamais un doublon automatique pour une race domestique reconnue.
 */
export {
  isSharedDomesticBinomial,
  isSpeciesBinomial,
  normalizeScientific,
} from '../../supabase/functions/_shared/shared-binomials';
