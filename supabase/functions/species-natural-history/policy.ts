export type Measurement = { value: string; kind: 'average' | 'range' | 'estimate' };

export function exactTaxonomy(match: Record<string, unknown>, scientific: string) {
  if (match.matchType !== 'EXACT' || match.kingdom !== 'Animalia' ||
      !['SPECIES', 'SUBSPECIES'].includes(String(match.rank)) ||
      String(match.canonicalName).toLowerCase() !== scientific.trim().toLowerCase()) return null;
  return {
    phylum: typeof match.phylum === 'string' ? match.phylum : null,
    class_name: typeof match.class === 'string' ? match.class : null,
    order_name: typeof match.order === 'string' ? match.order : null,
    family: typeof match.family === 'string' ? match.family : null,
    gbif_key: typeof match.usageKey === 'number' ? match.usageKey : null,
  };
}

// ADW separates averages from ranges and metric values from imperial conversions.
// Never calculate a supposed mean from a range or scrape numbers from prose.
export function extractMeasurements(html: string): Record<string, Measurement> {
  const result: Record<string, Measurement> = {};
  for (const [key, field] of [['size', 'length'], ['weight', 'mass']] as const) {
    for (const [label, kind] of [['Average', 'average'], ['Range', 'range']] as const) {
      const re = new RegExp(`<dt\\b[^>]*>\\s*${label} ${field}\\s*</dt>\\s*<dd\\b[^>]*>([\\s\\S]*?)</dd>`, 'i');
      const value = html.match(re)?.[1]?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (value && /^(?:\d+(?:\.\d+)?)(?:\s+to\s+\d+(?:\.\d+)?)?\s*(?:mm|cm|m|mg|g|kg)$/.test(value)) {
        result[key] = { value, kind };
        break;
      }
    }
  }
  return result;
}

const METRIC_VALUE = /^\d+(?:\.\d+)?(?:\s+to\s+\d+(?:\.\d+)?)?\s*(?:mm|cm|m|mg|g|kg)$/;

// When no measured source exists, an AI estimate fills the sheet. Only strict
// metric values are kept; anything else is dropped so prose never leaks in.
export function parseEstimatedMeasurements(raw: string): Record<string, Measurement> {
  const result: Record<string, Measurement> = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch {
    return result;
  }
  if (typeof parsed !== 'object' || parsed === null) return result;
  for (const key of ['size', 'weight'] as const) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === 'string' && METRIC_VALUE.test(value.trim())) {
      result[key] = { value: value.trim(), kind: 'estimate' };
    }
  }
  return result;
}
// Catalogue names carry noise GBIF cannot match: double spaces, "sp.",
// cultivar labels in quotes. Strip it before looking up the backbone.
export function normalizeScientific(raw: string): string {
  return raw.replace(/["“”«»][^"“”«»]*["“”«»]/g, ' ')
    .replace(/\b(?:sp|spp|cf|aff)\.?(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

const GROUP_RANKS = ['GENUS', 'FAMILY', 'ORDER', 'CLASS', 'PHYLUM', 'FORM', 'VARIETY', 'SPECIES', 'SUBSPECIES'];

// Group-level entries (genus "sp.", families, domestic forms) still deserve
// their classification. Only the ranks GBIF actually resolved are kept;
// fuzzy matches and kingdom-only answers are never used.
export function groupTaxonomy(match: Record<string, unknown>) {
  if (!['EXACT', 'HIGHERRANK'].includes(String(match.matchType)) || match.kingdom !== 'Animalia' ||
      !GROUP_RANKS.includes(String(match.rank)) || typeof match.phylum !== 'string') return null;
  return {
    phylum: match.phylum,
    class_name: typeof match.class === 'string' ? match.class : null,
    order_name: typeof match.order === 'string' ? match.order : null,
    family: typeof match.family === 'string' ? match.family : null,
    gbif_key: typeof match.usageKey === 'number' ? match.usageKey : null,
  };
}
