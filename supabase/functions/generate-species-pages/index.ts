import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Génère les pages SEO publiques d'espèces (`/especes/<slug>`).
 *
 * Source : les espèces les plus capturées par la communauté (`top_captured_species`).
 * Pour chaque espèce sans page, un seul appel IA produit le contenu FR + EN
 * (reconnaissance, où/quand observer, alimentation, traces, espèces similaires,
 * conservation, rareté Faunex). Le résultat est stocké dans `species_pages`,
 * donc aucune dépense IA à l'affichage.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'google/gemini-2.5-flash'

const SYSTEM = [
  "Tu es naturaliste de terrain et rédacteur SEO pour Faunex, une application d'identification d'animaux.",
  "Tu rédiges une fiche encyclopédique GÉNÉRIQUE sur une espèce (jamais sur une photo ou un individu).",
  'Contexte géographique par défaut : France et Europe de l’Ouest.',
  'Style : clair, concret, utile sur le terrain, phrases courtes, aucun superlatif marketing, aucune invention.',
  'Si une information est incertaine pour ce taxon, reste général et prudent plutôt que faux.',
  "Si le nom fourni désigne un groupe (famille, genre) ou une race domestique, rédige à propos de ce groupe ou de cette race.",
  'Unités métriques. Tu réponds UNIQUEMENT via l’appel de fonction species_page.',
].join(' ')

const SECTION_FIELDS = [
  ['intro', 'Chapeau de 2 à 3 phrases présentant l’espèce et l’intérêt de l’observer.'],
  ['recognize', 'Comment reconnaître l’espèce : taille, silhouette, couleurs, critères distinctifs. 3 à 5 phrases.'],
  ['where', 'Où l’observer : habitats, milieux, répartition en France et en Europe. 3 à 5 phrases.'],
  ['when', 'Quand l’observer : saisons, mois favorables, rythme journalier (diurne/nocturne/crépusculaire). 3 à 4 phrases.'],
  ['diet', 'Que mange l’espèce : régime alimentaire et façon de se nourrir. 2 à 4 phrases.'],
  ['behaviour', 'Comportement et reproduction : mœurs, cycle de vie, hivernage éventuel. 3 à 4 phrases.'],
  ['tracks', 'Traces et indices de présence : empreintes, crottes, restes, nids, chants, toiles, mues… 2 à 4 phrases.'],
  ['similar', 'Espèces similaires et comment les distinguer. 2 à 4 phrases, cite 2 à 3 espèces proches.'],
  ['conservation', 'Statut de conservation, menaces et gestes utiles pour la protéger. 2 à 4 phrases.'],
  ['funFact', 'Une anecdote vérifiée et mémorable en 1 à 2 phrases.'],
] as const

function localeSchema(lang: 'français' | 'anglais') {
  const props: Record<string, unknown> = {
    title: {
      type: 'string',
      description: `Titre H1 en ${lang}, du type « Hérisson d'Europe : identifier, observer et protéger ». Max 70 caractères.`,
    },
    metaTitle: { type: 'string', description: `Balise title en ${lang}, moins de 60 caractères, nom de l’espèce en premier.` },
    metaDescription: { type: 'string', description: `Meta description en ${lang}, 140 à 155 caractères, sans guillemets.` },
  }
  for (const [key, desc] of SECTION_FIELDS) props[key] = { type: 'string', description: `${desc} (en ${lang})` }
  return {
    type: 'object',
    properties: props,
    required: ['title', 'metaTitle', 'metaDescription', ...SECTION_FIELDS.map(([k]) => k)],
    additionalProperties: false,
  }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'species_page',
      description: 'Contenu bilingue de la page espèce',
      parameters: {
        type: 'object',
        properties: { fr: localeSchema('français'), en: localeSchema('anglais') },
        required: ['fr', 'en'],
        additionalProperties: false,
      },
    },
  },
]

/** Slug SEO : minuscules, sans accents, mots séparés par des tirets. */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return json({ error: 'missing LOVABLE_API_KEY' }, 500)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Accès réservé : cron interne ou administrateur.
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedCron = Deno.env.get('CRON_SECRET')
    let allowed = !!expectedCron && cronSecret === expectedCron
    if (!allowed) {
      const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
      const { data: userData } = await admin.auth.getUser(token)
      const uid = userData?.user?.id
      if (!uid) return json({ error: 'unauthorized' }, 401)
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' })
      allowed = !!isAdmin
    }
    if (!allowed) return json({ error: 'forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const batch = Math.max(1, Math.min(Number(body?.limit) || 5, 12))
    const pool = Math.max(10, Math.min(Number(body?.pool) || 100, 300))

    const { data: top, error: topError } = await admin.rpc('top_captured_species', { p_limit: pool })
    if (topError) return json({ error: topError.message }, 500)

    const { data: existing } = await admin.from('species_pages').select('slug')
    const done = new Set((existing || []).map((r: { slug: string }) => r.slug))

    const queue = (top || [])
      .map((row: Record<string, unknown>) => ({ ...row, slug: slugify(String(row.animal_name || '')) }))
      .filter((row: { slug: string }) => row.slug && !done.has(row.slug))
      .slice(0, batch)

    const results: Array<{ slug: string; ok: boolean; error?: string }> = []

    for (const species of queue) {
      const name = String(species.animal_name)
      const scientific = species.scientific_name ? String(species.scientific_name) : ''

      // Réutilise la fiche existante comme matière première (moins d'hallucinations).
      const { data: profile } = await admin.rpc('species_profile_for', {
        p_name: name,
        p_scientific: scientific || null,
      })
      const fiche = Array.isArray(profile) ? profile[0] : null

      const prompt = [
        `Espèce : ${name}`,
        scientific ? `Nom scientifique : ${scientific}` : '',
        species.category ? `Catégorie Faunex : ${species.category}` : '',
        species.iucn_status ? `Statut UICN connu : ${species.iucn_status}` : '',
        species.rarity ? `Rareté Faunex : ${species.rarity}` : '',
        fiche?.description ? `Fiche existante — description : ${fiche.description}` : '',
        fiche?.habitat ? `Fiche existante — habitat : ${fiche.habitat}` : '',
        fiche?.diet ? `Fiche existante — alimentation : ${fiche.diet}` : '',
        fiche?.conservation ? `Fiche existante — conservation : ${fiche.conservation}` : '',
        fiche?.fun_fact ? `Fiche existante — anecdote : ${fiche.fun_fact}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: prompt },
          ],
          tools: TOOLS,
          tool_choice: { type: 'function', function: { name: 'species_page' } },
        }),
      })

      if (!res.ok) {
        const detail = await res.text()
        results.push({ slug: species.slug, ok: false, error: `ai_${res.status}: ${detail.slice(0, 200)}` })
        if (res.status === 429) break
        continue
      }

      const payload = await res.json()
      const args = payload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
      let content: unknown = null
      try {
        content = args ? JSON.parse(args) : null
      } catch {
        content = null
      }
      if (!content) {
        results.push({ slug: species.slug, ok: false, error: 'invalid_ai_payload' })
        continue
      }

      const { error: upsertError } = await admin.from('species_pages').upsert(
        {
          slug: species.slug,
          animal_name: name,
          scientific_name: scientific || null,
          category: species.category || null,
          rarity: species.rarity || null,
          iucn_status: species.iucn_status || null,
          capture_count: Number(species.captures) || 0,
          content,
          published: true,
        },
        { onConflict: 'slug' },
      )

      results.push({ slug: species.slug, ok: !upsertError, error: upsertError?.message })
    }

    const { count } = await admin
      .from('species_pages')
      .select('slug', { count: 'exact', head: true })
      .eq('published', true)

    return json({ generated: results.filter((r) => r.ok).length, total_published: count ?? null, results })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
