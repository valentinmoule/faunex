export const MORPHOLOGY_RULE = `MORPHOLOGIE AVANT LE NOM : observe uniquement les caractères réellement visibles : appendices, segmentation, proportions, forme, motifs et structures distinctives. Ne compte pas les caractères masqués comme absents. Le lieu ou le nom proposé ne prouve jamais une espèce. Si le sujet est petit/flou ou les caractères spécifiques invisibles : rang supérieur sûr et confiance ≤60, jamais un binôme deviné.`;

export function moderationVisionModels(quality: string, forceName: boolean) {
  return quality === 'high' && !forceName
    ? ['google/gemini-3.8-flash']
    : ['google/gemini-3.1-flash-lite', 'google/gemini-3.8-flash'];
}