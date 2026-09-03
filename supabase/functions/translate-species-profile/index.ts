import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Traduction à la demande d'une fiche d'espèce (FR -> EN), avec mise en cache
 * dans `species_profiles.*_en`. Appelée par l'app quand un utilisateur anglophone
 * ouvre une carte dont la fiche EN n'existe pas encore.
 *
 * Coût maîtrisé : appel texte seul, une seule fois par espèce (résultat caché).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'google/gemini-3.1-flash-lite'

const SYSTEM = [
  'You are a bilingual FR/EN naturalist writing encyclopaedia entries.',
  'Translate the French species fact sheet into natural, idiomatic English.',
  'Keep the same factual content, keep it generic about the species (never about a photo or an individual),',
  'keep a similar length, use the official English vernacular name when the species is mentioned,',
  'and keep metric units. Answer only through the species_profile_en function call.',
].join(' ')

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'species_profile_en',
      description: 'English translation of the species fact sheet',
      parameters: {
        type: 'object',
        properties: {
          name_en: { type: 'string', description: 'Official English vernacular name of the species' },
          description: { type: 'string' },
          habitat: { type: 'string' },
          diet: { type: 'string' },
          fun_fact: { type: 'string' },
        },
        required: ['name_en', 'description', 'habitat', 'diet', 'fun_fact'],
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
    if (!LOVABLE_API_KEY) return json({ error: 'missing LOVABLE_API_KEY' }, 500)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Utilisateur authentifié requis (évite l'usage anonyme du modèle).
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(token)
    if (!userData?.user?.id) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const name: string = String(body?.name || '').trim()
    const scientific: string = String(body?.scientific_name || '').trim()
    if (!name) return json({ error: 'missing name' }, 400)

    const source = {
      description: String(body?.description || '').trim(),
      habitat: String(body?.habitat || '').trim(),
      diet: String(body?.diet || '').trim(),
      fun_fact: String(body?.fun_fact || '').trim(),
    }

    // 1) Cache : fiche EN déjà traduite ?
    const { data: cached } = await admin.rpc('species_profile_en', {
      p_name: name,
      p_scientific: scientific || null,
    })
    const hit = Array.isArray(cached) ? cached[0] : null
    if (hit?.description_en) {
      return json({
        cached: true,
        description: hit.description_en,
        habitat: hit.habitat_en,
        diet: hit.diet_en,
        fun_fact: hit.fun_fact_en,
      })
    }

    // 2) Complète les champs manquants depuis species_profiles (FR).
    const { data: fr } = await admin
      .from('species_profiles')
      .select('id, description, habitat, diet, fun_fact')
      .or(
        [
          `normalized_name.eq.${name.toLowerCase()}`,
          scientific ? `normalized_scientific.eq.${scientific.toLowerCase()}` : '',
        ]
          .filter(Boolean)
          .join(','),
      )
      .limit(1)
      .maybeSingle()

    const payload = {
      name,
      scientific_name: scientific || undefined,
      description: source.description || fr?.description || '',
      habitat: source.habitat || fr?.habitat || '',
      diet: source.diet || fr?.diet || '',
      fun_fact: source.fun_fact || fr?.fun_fact || '',
    }

    if (!payload.description && !payload.habitat && !payload.diet && !payload.fun_fact) {
      return json({ error: 'nothing_to_translate' }, 404)
    }

    // 3) Traduction.
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        tools: TOOLS,
        tool_choice: { type: 'function', function: { name: 'species_profile_en' } },
      }),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      return json({ error: `ai_gateway_${res.status}`, detail }, res.status === 429 ? 429 : 502)
    }
    const out = await res.json()
    const call = out?.choices?.[0]?.message?.tool_calls?.[0]
    if (!call?.function?.arguments) return json({ error: 'no_translation' }, 502)
    const t = JSON.parse(call.function.arguments) as Record<string, string>

    // 4) Cache en base (fiche + nom EN de l'espèce).
    const normalized = String(name).toLowerCase()
    const patch = {
      description_en: t.description || null,
      habitat_en: t.habitat || null,
      diet_en: t.diet || null,
      fun_fact_en: t.fun_fact || null,
      translated_en_at: new Date().toISOString(),
    }

    if (fr?.id) {
      await admin.from('species_profiles').update(patch).eq('id', fr.id)
    } else {
      await admin.from('species_profiles').insert({
        normalized_name: normalized,
        animal_name: name,
        scientific_name: scientific || null,
        normalized_scientific: scientific ? scientific.toLowerCase() : null,
        description: payload.description || null,
        habitat: payload.habitat || null,
        diet: payload.diet || null,
        fun_fact: payload.fun_fact || null,
        source: 'translation',
        ...patch,
      })
    }

    if (t.name_en) {
      await admin
        .from('animals')
        .update({ name_en: t.name_en })
        .ilike('name', name)
        .is('name_en', null)
    }

    return json({
      cached: false,
      name_en: t.name_en || null,
      description: t.description || null,
      habitat: t.habitat || null,
      diet: t.diet || null,
      fun_fact: t.fun_fact || null,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
