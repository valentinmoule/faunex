import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Traduction par lots des noms communs d'espèces (FR -> EN).
 *
 * Objectif : renseigner `animals.name_en` (et `taxa.vernacular_name_en`) avec le
 * nom vernaculaire ANGLAIS OFFICIEL de l'espèce, en s'appuyant d'abord sur le
 * référentiel iNaturalist (nom vernaculaire réel, gratuit), puis sur l'IA en
 * repli pour les espèces absentes du référentiel.
 *
 * Appel admin uniquement. Idempotent : ne traite que les lignes sans traduction.
 * Rappelable en boucle jusqu'à `remaining = 0`.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'google/gemini-3.1-flash-lite'

const SYSTEM = [
  'You are a bilingual FR/EN zoologist maintaining a species catalogue.',
  'For each entry you receive the French common name and (often) the scientific name.',
  'Return the OFFICIAL English vernacular name used by field guides (e.g. "Renard roux" -> "Red fox",',
  '"Mésange bleue" -> "Eurasian blue tit"), never a literal word-for-word translation.',
  'Sentence case only (capitalise the first letter and proper nouns: "Eurasian blue tit", "Père David\'s deer").',
  'If no English vernacular name exists, return the scientific name as-is.',
  'Answer only through the translate_names function call, keeping the same ids.',
].join(' ')

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'translate_names',
      description: 'English vernacular names for the submitted species',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Id received in the request' },
                name_en: { type: 'string', description: 'Official English vernacular name' },
              },
              required: ['id', 'name_en'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
]

type Row = { id: string; name: string; scientific_name: string | null }

const sentenceCase = (s: string) => {
  const v = s.trim().replace(/\s+/g, ' ')
  if (!v) return v
  return v.charAt(0).toUpperCase() + v.slice(1)
}

/** Nom vernaculaire anglais via iNaturalist (référentiel officiel, gratuit). */
async function inaturalistName(row: Row): Promise<string | null> {
  const q = row.scientific_name?.trim()
  if (!q) return null
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&locale=en&per_page=1&is_active=true`
    const res = await fetch(url, { headers: { 'User-Agent': 'Faunex/1.0 (species i18n)' } })
    if (!res.ok) return null
    const json = await res.json()
    const hit = json?.results?.[0]
    if (!hit) return null
    const sameTaxon =
      String(hit.name || '').toLowerCase().trim() === q.toLowerCase().trim()
    const common = hit.preferred_common_name || hit.english_common_name
    if (!sameTaxon || !common) return null
    return sentenceCase(String(common))
  } catch {
    return null
  }
}

async function aiNames(rows: Row[], apiKey: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (rows.length === 0) return out

  const payload = rows.map((r) => ({
    id: r.id,
    fr: r.name,
    scientific: r.scientific_name || undefined,
  }))

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      tools: TOOLS,
      tool_choice: { type: 'function', function: { name: 'translate_names' } },
    }),
  })

  if (!res.ok) {
    throw new Error(`ai_gateway_${res.status}: ${(await res.text()).slice(0, 300)}`)
  }

  const json = await res.json()
  const call = json?.choices?.[0]?.message?.tool_calls?.[0]
  const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null
  for (const item of args?.items ?? []) {
    if (item?.id && typeof item.name_en === 'string' && item.name_en.trim()) {
      out.set(String(item.id), sentenceCase(item.name_en))
    }
  }
  return out
}

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

    // Admin uniquement (ou auto-appel interne avec la clé de service).
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const internal = token === serviceKey
    if (!internal) {
      const { data: userData } = await admin.auth.getUser(token)
      const uid = userData?.user?.id
      if (!uid) return json({ error: 'unauthorized' }, 401)
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' })
      if (!isAdmin) return json({ error: 'forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body?.limit) || 200, 400)
    const useInat = body?.inaturalist !== false
    // Budget temps : on enchaîne les lots dans le même appel pour limiter
    // le nombre d'invocations nécessaires sur les 5 800 espèces.
    const budgetMs = Math.min(Math.max(Number(body?.budget_ms) || 90_000, 5_000), 240_000)
    const startedAt = Date.now()
    let totalProcessed = 0
    let totalWritten = 0
    let totalInat = 0

    while (true) {

    const { data: pending, error } = await admin
      .from('animals')
      .select('id, name, scientific_name')
      .is('name_en', null)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw error

    const rows = (pending || []) as Row[]
    if (rows.length === 0) break

    const resolved = new Map<string, string>()

    // 1) Référentiel iNaturalist (par petits paquets pour rester poli avec l'API).
    if (useInat) {
      for (let i = 0; i < rows.length; i += 5) {
        const chunk = rows.slice(i, i + 5)
        const names = await Promise.all(chunk.map(inaturalistName))
        chunk.forEach((row, idx) => {
          const n = names[idx]
          if (n) resolved.set(row.id, n)
        })
      }
    }

    // 2) IA en repli, par lots de 40.
    const missing = rows.filter((r) => !resolved.has(r.id))
    for (let i = 0; i < missing.length; i += 40) {
      const chunk = missing.slice(i, i + 40)
      const map = await aiNames(chunk, LOVABLE_API_KEY)
      map.forEach((v, k) => resolved.set(k, v))
    }

    // 3) Écriture. Repli sur le nom scientifique (ou le nom FR) si aucune
    //    traduction n'a pu être obtenue : évite de re-traiter la ligne à l'infini.
    for (const row of rows) {
      const nameEn = resolved.get(row.id) || row.scientific_name || row.name
      if (!nameEn) continue
      const { error: upErr } = await admin.from('animals').update({ name_en: nameEn }).eq('id', row.id)
      if (upErr) continue

      totalWritten += 1
      if (row.scientific_name) {
        await admin
          .from('taxa')
          .update({ vernacular_name_en: nameEn })
          .eq('scientific_name', row.scientific_name)
          .is('vernacular_name_en', null)
      }
    }

    totalProcessed += rows.length
    totalInat += rows.length - missing.length

    if (Date.now() - startedAt > budgetMs) break
    }

    const { count: remaining } = await admin
      .from('animals')
      .select('id', { count: 'exact', head: true })
      .is('name_en', null)

    const { data: progress } = await admin.rpc('species_translation_progress')

    // Chaînage : relance l'exécution suivante sans attendre, jusqu'à épuisement.
    if (body?.chain && (remaining ?? 0) > 0) {
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/translate-species-names`
      void fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, chain: true }),
      }).catch(() => {})
    }

    return json({
      processed: totalProcessed,
      written: totalWritten,
      inaturalist: useInat ? totalInat : 0,
      remaining: remaining ?? null,
      progress: progress?.[0] ?? null,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
