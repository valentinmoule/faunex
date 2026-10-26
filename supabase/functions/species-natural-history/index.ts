import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { exactTaxonomy, extractMeasurements, groupTaxonomy, normalizeScientific, parseEstimatedMeasurements } from './policy.ts';

// Typical adult size/weight estimated by AI when no measured source (ADW)
// documents the species. Strict JSON schema, metric only, validated before caching.
async function estimateMeasurements(name: string, scientific: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return {};
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        store: false,
        stream: true,
        reasoning: { effort: 'low' },
        text: {
          format: {
            type: 'json_schema',
            name: 'adult_measurements',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                size: { type: ['string', 'null'], description: 'Typical adult body length, metric, e.g. "12 cm" or "8 to 15 cm". Null if unknown.' },
                weight: { type: ['string', 'null'], description: 'Typical adult weight, metric, e.g. "30 g" or "20 to 45 g". Null if unknown.' },
              },
              required: ['size', 'weight'],
              additionalProperties: false,
            },
          },
        },
        input: [
          { role: 'system', content: 'You are a zoology reference. Answer with the requested JSON only.' },
          { role: 'user', content: `For the species "${name}" (${scientific}), give the typical adult body length and weight. Use a range ("x to y unit") when variation is large. Metric units only (mm, cm, m, mg, g, kg). If genuinely unknown for this species, use null.` },
        ],
      }),
    });
    if (!response.ok || !response.body) return {};
    // Consume the SSE stream and keep the final accumulated text.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'response.output_text.delta' && typeof parsed.delta === 'string') text += parsed.delta;
            else if (parsed.type === 'response.completed') {
              const output = parsed.response?.output ?? [];
              for (const item of output) {
                for (const part of item?.content ?? []) {
                  if (part?.type === 'output_text' && typeof part.text === 'string') text = part.text;
                }
              }
            }
          } catch { /* partial event, ignore */ }
        }
      }
    }
    return text ? parseEstimatedMeasurements(text) : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'configuration_error' }, 500);
    const admin = createClient(url, key);
    const { data: auth } = await admin.auth.getUser((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
    if (!auth.user) return json({ error: 'unauthorized' }, 401);
    const body = await req.json().catch(() => null);
    if (typeof body?.name !== 'string' || !body.name.trim() || body.name.length > 200 ||
        typeof body?.scientific_name !== 'string' || body.scientific_name.length > 200) return json({ error: 'invalid_species' }, 400);
    // The catalogue, not the request, is authoritative for identity.
    const { data: animal, error } = await admin.from('animals').select('id,name,scientific_name')
      .eq('name', body.name.trim()).maybeSingle();
    if (error) return json({ error: 'catalogue_unavailable' }, 503);
    if (!animal?.scientific_name || animal.scientific_name.toLowerCase() !== body.scientific_name.trim().toLowerCase()) return json(null);
    const scientific = animal.scientific_name.trim();
    const { data: cache } = await admin.from('species_natural_history').select('*').eq('animal_id', animal.id).maybeSingle();
    if (cache?.scientific_name === scientific && Date.now() - Date.parse(cache.checked_at) < 90 * 86400000) return json(cache);
    const normalized = normalizeScientific(scientific);
    const gbif = async (params: Record<string, string>) => {
      const res = await fetch(`https://api.gbif.org/v1/species/match?${new URLSearchParams({ strict: 'true', ...params })}`, { signal: AbortSignal.timeout(8000) });
      return res.ok ? await res.json() as Record<string, unknown> : null;
    };
    const match = normalized ? await gbif({ name: normalized }) : {};
    if (!match) return json({ error: 'source_unavailable' }, 503);
    const exact = exactTaxonomy(match, normalized);
    // Group entries (genus "sp.", families, domestic forms) keep their
    // resolved ranks; unknown binomials fall back to their exact genus.
    let taxonomy = exact ?? groupTaxonomy(match);
    const genus = normalized.split(' ')[0];
    if (!taxonomy && normalized.includes(' ') && /^[A-Z][a-z]+$/.test(genus)) {
      const genusMatch = await gbif({ name: genus, rank: 'GENUS' });
      if (genusMatch?.rank === 'GENUS' && genusMatch.canonicalName === genus) taxonomy = groupTaxonomy(genusMatch);
    }
    if (!taxonomy) return json(null);
    const sources = [{ label: 'GBIF', url: `https://www.gbif.org/species/${taxonomy.gbif_key}` }];
    let measurements = {};
    // Shared binomials (including domestic breeds) do not share measurements.
    const { count, error: siblingError } = await admin.from('animals').select('id', { count: 'exact', head: true }).ilike('scientific_name', scientific);
    if (exact && !siblingError && count === 1 && /^[A-Z][a-z]+ [a-z]+$/.test(normalized)) {
      const sourceUrl = `https://animaldiversity.org/accounts/${normalized.replace(' ', '_')}/`;
      try {
        const page = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Faunex/1.0 (+https://faunex.fr)' } });
        if (page.ok) {
          const html = await page.text();
          if (html.includes(normalized)) measurements = extractMeasurements(html);
          if (Object.keys(measurements).length) sources.push({ label: 'Animal Diversity Web · University of Michigan', url: sourceUrl });
        }
      } catch { /* Unknown measurements remain unknown; taxonomy is still usable. */ }
      // No measured source: fall back to an AI estimate, clearly labelled.
      if (!Object.keys(measurements).length) {
        measurements = await estimateMeasurements(body.name.trim(), scientific);
        if (Object.keys(measurements).length) sources.push({ label: 'Estimation IA', url: 'https://faunex.fr' });
      }
    }
    const record = { animal_id: animal.id, scientific_name: scientific, ...taxonomy, measurements, sources, checked_at: new Date().toISOString() };
    const { error: saveError } = await admin.from('species_natural_history').upsert(record);
    if (saveError) return json({ error: 'cache_unavailable' }, 503);
    return json(record);
  } catch { return json({ error: 'source_unavailable' }, 503); }
});