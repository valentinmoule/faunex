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