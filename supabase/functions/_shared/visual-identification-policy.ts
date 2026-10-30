export const MORPHOLOGY_RULE = `MORPHOLOGIE AVANT LE NOM : observe uniquement les caractères réellement visibles : appendices, segmentation, proportions, forme, motifs et structures distinctives. Ne compte pas les caractères masqués comme absents. Le lieu ou le nom proposé ne prouve jamais une espèce. Si le sujet est petit/flou ou les caractères spécifiques invisibles : rang supérieur sûr et confiance ≤60, jamais un binôme deviné. RACES DOMESTIQUES : cherche une race réelle grâce à ses caractères diagnostiques, jamais grâce au seul sexe ou à une couleur. Chez la poule et le coq, Gallus gallus domesticus est partagé par les races, pas une preuve de race ; une fiche générique « Poule et coq domestiques » (ou poule/coq domestique) est interdite. Si la race n'est pas confirmable, conserve l'incertitude pour la modération, sans inventer de race (breed_uncertain true si ce champ est disponible).`;

/** Generic domestic chicken identities cannot become collection tiles. */
export function isGenericDomesticChicken(value: unknown): boolean {
  const name = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  return /^(?:(?:poule|coq)(?: domestiques?)?(?: et (?:poule|coq)(?: domestiques?)?)?)$/.test(name);
}

export function moderationVisionModels(quality: string, forceName: boolean) {
  return quality === 'high' && !forceName
    ? ['google/gemini-3.8-flash']
    : ['google/gemini-3.1-flash-lite', 'google/gemini-3.8-flash'];
}