import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { exactTaxonomy, extractMeasurements, parseEstimatedMeasurements } from './policy.ts';

// Typical adult size/weight estimated by AI when no measured source (ADW)
// documents the species. Strict JSON, metric only, validated before caching.
async function estimateMeasurements(name: string, scientific: string) {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return {};
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a zoology reference. Reply with strict JSON only, no markdown, no prose.' },
          { role: 'user', content: `For the species "${name}" (${scientific}), give the typical adult body length and weight as JSON: {"size": "<number or range> <mm|cm|m>", "weight": "<number or range> <mg|g|kg>"}. Use a range ("x to y unit") when variation is large. Metric units only. If genuinely unknown for this species, omit the key.` },
        ],
        temperature: 0,
      }),
    });
    if (!response.ok) return {};
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? parseEstimatedMeasurements(content) : {};
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
    if (!animal?.scientific_name || animal.scientific_name.toLowerCase() !== body.scientific_name.trim().toLowerCase()) return json({ error: 'identity_conflict' }, 404);
    const scientific = animal.scientific_name.trim();
    const { data: cache } = await admin.from('species_natural_history').select('*').eq('animal_id', animal.id).maybeSingle();
    if (cache?.scientific_name === scientific && Date.now() - Date.parse(cache.checked_at) < 90 * 86400000) return json(cache);
    const response = await fetch(`https://api.gbif.org/v1/species/match?strict=true&name=${encodeURIComponent(scientific)}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return json({ error: 'source_unavailable' }, 503);
    const taxonomy = exactTaxonomy(await response.json(), scientific);
    if (!taxonomy) return json({ error: 'unresolved_identity' }, 404);
    const sources = [{ label: 'GBIF', url: `https://www.gbif.org/species/${taxonomy.gbif_key}` }];
    let measurements = {};
    // Shared binomials (including domestic breeds) do not share measurements.
    const { count, error: siblingError } = await admin.from('animals').select('id', { count: 'exact', head: true }).ilike('scientific_name', scientific);
    if (!siblingError && count === 1 && /^[A-Z][a-z]+ [a-z]+$/.test(scientific)) {
      const sourceUrl = `https://animaldiversity.org/accounts/${scientific.replace(' ', '_')}/`;
      try {
        const page = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Faunex/1.0 (+https://faunex.fr)' } });
        if (page.ok) {
          const html = await page.text();
          if (html.includes(scientific)) measurements = extractMeasurements(html);
          if (Object.keys(measurements).length) sources.push({ label: 'Animal Diversity Web · University of Michigan', url: sourceUrl });
        }
      } catch { /* Unknown measurements remain unknown; taxonomy is still usable. */ }
    }
    const record = { animal_id: animal.id, scientific_name: scientific, ...taxonomy, measurements, sources, checked_at: new Date().toISOString() };
    const { error: saveError } = await admin.from('species_natural_history').upsert(record);
    if (saveError) return json({ error: 'cache_unavailable' }, 503);
    return json(record);
  } catch { return json({ error: 'source_unavailable' }, 503); }
});