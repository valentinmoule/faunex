export const MORPHOLOGY_RULE = `MORPHOLOGIE AVANT LE NOM : observe les appendices, antennes, segmentation et proportions réellement visibles. Araignée : 8 pattes, aucune antenne, deux régions corporelles ; punaise de lit : 6 pattes, 2 antennes, corps ovale aplati et abdomen segmenté. Ne compte pas les appendices masqués comme absents. Le lieu ou le nom proposé ne prouve jamais une espèce. Si le sujet est petit/flou ou les caractères spécifiques invisibles : rang supérieur sûr et confiance ≤60, jamais un binôme deviné.`;

export function needsIndependentVisualCheck(data: { animal_name?: unknown; scientific_name?: unknown } | null) {
  return /punaise(?:s)? (?:de|des) lits?|bed[ -]?bugs?/i.test(String(data?.animal_name ?? '')) ||
    /^(?:Cimex\b|Cimicidae\b)/i.test(String(data?.scientific_name ?? ''));
}

export function moderationVisionModels(quality: string, forceName: boolean) {
  return quality === 'high' && !forceName
    ? ['google/gemini-3.8-flash']
    : ['google/gemini-3.1-flash-lite', 'google/gemini-3.8-flash'];
}