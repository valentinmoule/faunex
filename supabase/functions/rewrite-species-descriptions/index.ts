import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Maintenance ponctuelle : réécrit de façon GÉNÉRIQUE les fiches d'espèces
 * (species_profiles) dont la description parle de la photo ou de l'individu
 * observé ("sur cette photo", "on voit", "ce spécimen"…), puis propage la
 * fiche corrigée à toutes les captures de l'espèce.
 *
 * Appel texte seul (sans image) → coût minimal.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PHOTO_SPECIFIC =
  /(sur|dans) (la|cette|l['’]) ?(photo|image|cliché)|l['’]image|le cliché|on (voit|aperçoit|distingue|observe)|ce spécimen|cet individu|comme (celui|celle)(-ci| sur)|premier plan|photographié|arrière-plan|visible ici|ici,/i


const MODEL = 'google/gemini-3.1-flash-lite'

const SYSTEM = [
  "Naturaliste francophone. Rédige une fiche d'encyclopédie GÉNÉRIQUE de l'espèce demandée :",
  "elle est affichée pour toutes les observations de cette espèce, indépendamment de toute photo.",
  "Interdiction absolue de décrire une image ou un individu précis : jamais \"sur la photo\", \"on voit\",",
  "\"l'image\", \"ce spécimen\", \"ici\", \"au premier plan\", \"photographié\", ni posture, décor ou arrière-plan.",
  "Décris l'espèce en général au présent (morphologie typique, dimorphisme, comportement), de façon",
  "factuelle et vérifiée, sans invention. Réponds uniquement via l'appel de fonction species_profile.",
].join(' ')

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'species_profile',
      description: "Fiche générique d'espèce",
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description:
              "2-3 phrases GÉNÉRIQUES sur l'espèce (physique distinctif typique, comportement). Aucune référence à une photo ou à un individu observé.",
          },
          habitat: { type: 'string', description: 'Habitat et répartition.' },
          diet: { type: 'string', description: 'Régime alimentaire.' },
          conservation: { type: 'string', description: "Statut UICN : LC, NT, VU, EN, CR ou 'Domestique'." },
          fun_fact: { type: 'string', description: 'Fait surprenant et vérifié.' },
        },
        required: ['description', 'habitat', 'diet', 'conservation', 'fun_fact'],
        additionalProperties: false,
      },
    },
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    if (!LOVABLE_API_KEY) return json({ error: 'missing LOVABLE_API_KEY' }, 500)

    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body?.limit) || 25, 60)
    const dryRun = body?.dryRun === true

    // 1) Fiches à réécrire
    const bad: Array<{ id: string; animal_name: string; scientific_name: string | null; normalized_name: string; description: string }> = []
    for (let from = 0; from < 6000 && bad.length < limit; from += 1000) {
      const { data, error } = await admin
        .from('species_profiles')
        .select('id, animal_name, scientific_name, normalized_name, description')
        .order('animal_name')
        .range(from, from + 999)
      if (error) return json({ error: error.message }, 500)
      if (!data?.length) break
      for (const row of data) {
        if (row.description && PHOTO_SPECIFIC.test(row.description)) bad.push(row as typeof bad[number])
        if (bad.length >= limit) break
      }
      if (data.length < 1000) break
    }

    if (dryRun) return json({ pending: bad.length, names: bad.map((b) => b.animal_name) })

    const results: Array<{ name: string; ok: boolean; captures?: number; error?: string }> = []

    for (const row of bad) {
      try {
        const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.2,
            messages: [
              { role: 'system', content: SYSTEM },
              {
                role: 'user',
                content: `Espèce : ${row.animal_name}${row.scientific_name ? ` (${row.scientific_name})` : ''}.`,
              },
            ],
            tools: TOOLS,
            tool_choice: { type: 'function', function: { name: 'species_profile' } },
          }),
        })
        if (!r.ok) {
          results.push({ name: row.animal_name, ok: false, error: `ai ${r.status}` })
          continue
        }
        const d = await r.json()
        const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
        const p = args ? JSON.parse(args) : null
        if (!p?.description || PHOTO_SPECIFIC.test(p.description)) {
          results.push({ name: row.animal_name, ok: false, error: 'still photo-specific' })
          continue
        }

        const { error: upErr } = await admin
          .from('species_profiles')
          .update({
            description: p.description,
            habitat: p.habitat,
            diet: p.diet,
            conservation: p.conservation,
            fun_fact: p.fun_fact,
            source: 'generic_rewrite',
          })
          .eq('id', row.id)
        if (upErr) {
          results.push({ name: row.animal_name, ok: false, error: upErr.message })
          continue
        }

        // Propagation aux captures de l'espèce
        const { data: caps, error: capErr } = await admin
          .from('captures')
          .update({
            description: p.description,
            habitat: p.habitat,
            diet: p.diet,
            conservation: p.conservation,
            fun_fact: p.fun_fact,
          })
          .eq('animal_name', row.animal_name)
          .select('id')
        if (capErr) {
          results.push({ name: row.animal_name, ok: true, error: capErr.message })
          continue
        }
        results.push({ name: row.animal_name, ok: true, captures: caps?.length ?? 0 })
      } catch (e) {
        results.push({ name: row.animal_name, ok: false, error: String(e) })
      }
    }

    return json({
      processed: results.length,
      fixed: results.filter((r) => r.ok).length,
      results,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
