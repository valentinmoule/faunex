export const STRICT_SPECIES_RULES = `Ne valide jamais une proposition par simple ressemblance ou compatibilité générale. Exige des critères diagnostiques de l'espèce ou sous-espèce annoncée ; une espèce voisine, un genre ou une famille ne confirme pas une espèce précise. Le nom de l'observateur est une hypothèse, pas une preuve. Corrige uniquement une faute d'orthographe évidente ou un synonyme établi, sans inventer de nom français ou latin. En cas de doute, de photo insuffisante, de conflit scientifique ou de nom trop vague : name_matches false et confiance inférieure à 0,90, pour vérification humaine. N'accepte jamais une race domestique sur son seul binôme partagé.`;

export function requiresHumanSpeciesReview(input: { confidence: number; nameMatches: unknown; disagreement: boolean; unknown: boolean; notRealPhoto: boolean; scientific: unknown }) {
  const scientific = String(input.scientific ?? '').trim();
  return input.notRealPhoto || input.unknown || input.disagreement || input.nameMatches !== true ||
    !Number.isFinite(input.confidence) || input.confidence < 0.9 ||
    !/^[A-Z][a-z]+\s+[a-z][a-z-]+(?:\s+[a-z][a-z-]+)?$/.test(scientific);
}