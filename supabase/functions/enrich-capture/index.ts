import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Tu es un expert naturaliste de renommée mondiale (zoologie, ornithologie, herpétologie, entomologie, cynologie, félinologie).

On te donne la PHOTO d'une capture et le NOM validé par un modérateur humain. Ce nom fait autorité : ne le remets pas en cause, contente-toi de le normaliser en français correct (orthographe, majuscule) et, pour un animal domestique, précise la race si la photo la révèle.

Ta mission : produire une fiche d'espèce complète et fiable.

## Évaluation de la rareté (probabilité d'observation en Europe/France)
- **common** : observation quotidienne ou fréquente (pigeon, moineau, merle, chat européen, Labrador, hérisson, écureuil, carpe, canard colvert)
- **rare** : observation nécessitant patience ou chance (martin-pêcheur, hermine, Bengal, héron)
- **epic** : très rare, espèce vulnérable ou en danger (lynx, gypaète, loutre, ours brun, aigle royal)
- **mythic** : quasi-impossible, espèce en danger critique (loup gris en France, phoque moine)

Si le nom donné ne correspond à aucun animal réel (objet, peluche, blague), utilise l'animal le plus proche visible sur la photo ; à défaut rarity "common", category la plus proche, et reste factuel.

Réponds UNIQUEMENT via l'appel de fonction enrich_animal.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const callerId = claimsData.claims.sub as string

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: callerId, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const captureId: string | undefined = body?.capture_id
    const overrideName: string | undefined = body?.animal_name
    if (!captureId) return json({ error: 'capture_id is required' }, 400)

    const { data: capture, error: capErr } = await supabase
      .from('captures')
      .select('id, animal_name, description, image_url, location')
      .eq('id', captureId)
      .maybeSingle()

    if (capErr || !capture) return json({ error: 'Capture introuvable' }, 404)

    const animalName = (overrideName || capture.animal_name || '').toString().trim()
    if (!animalName) return json({ error: 'Nom d\'animal manquant' }, 400)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500)

    const userText = [
      `Nom validé par le modérateur : "${animalName}".`,
      capture.description ? `Note de l'observateur : "${String(capture.description).slice(0, 400)}".` : null,
      capture.location ? `Lieu d'observation : ${capture.location}.` : null,
      'Produis la fiche complète de cet animal et la boîte englobante du sujet sur la photo.',
    ].filter(Boolean).join('\n')

    const content: unknown[] = [{ type: 'text', text: userText }]
    if (capture.image_url) {
      content.push({ type: 'image_url', image_url: { url: capture.image_url } })
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'enrich_animal',
              description: 'Produit la fiche complète d\'un animal validé manuellement',
              parameters: {
                type: 'object',
                properties: {
                  animal_name: {
                    type: 'string',
                    description: 'Nom commun en français, normalisé (race précise pour un domestique).',
                  },
                  scientific_name: {
                    type: 'string',
                    description: 'Nom scientifique latin complet (genre + espèce).',
                  },
                  category: {
                    type: 'string',
                    enum: ['Mammifères', 'Oiseaux', 'Reptiles', 'Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Crustacés', 'Mollusques'],
                    description: 'Classe zoologique. Choisis exactement UNE de ces 9 catégories.',
                  },
                  description: {
                    type: 'string',
                    description: 'Description de 2-3 phrases : caractéristiques physiques distinctives et comportement typique.',
                  },
                  habitat: { type: 'string', description: 'Habitat naturel et répartition géographique.' },
                  diet: { type: 'string', description: 'Régime alimentaire détaillé.' },
                  conservation: { type: 'string', description: "Statut UICN : LC, NT, VU, EN, CR, ou 'Domestique'." },
                  fun_fact: { type: 'string', description: 'Un fait surprenant et vérifié scientifiquement.' },
                  rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'mythic'] },
                  subject_bbox: {
                    type: 'object',
                    description: 'Boîte englobante approximative de l\'animal sur la photo, normalisée 0..1. Omets si aucun animal visible.',
                    properties: {
                      x: { type: 'number', minimum: 0, maximum: 1 },
                      y: { type: 'number', minimum: 0, maximum: 1 },
                      w: { type: 'number', minimum: 0, maximum: 1 },
                      h: { type: 'number', minimum: 0, maximum: 1 },
                    },
                    required: ['x', 'y', 'w', 'h'],
                    additionalProperties: false,
                  },
                },
                required: ['animal_name', 'scientific_name', 'category', 'description', 'habitat', 'diet', 'conservation', 'fun_fact', 'rarity'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'enrich_animal' } },
      }),
    })

    if (!response.ok) {
      if (response.status === 429) return json({ error: 'Trop de requêtes, réessaye dans un moment.' }, 429)
      if (response.status === 402) return json({ error: 'Crédits IA épuisés.' }, 402)
      console.error('AI gateway error', response.status, await response.text())
      return json({ error: 'Erreur IA' }, 500)
    }

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall) return json({ error: 'Enrichissement impossible' }, 422)

    const animal = JSON.parse(toolCall.function.arguments)

    // Déduplication : si l'espèce existe déjà dans le bestiaire (nom commun OU nom
    // scientifique, insensible à la casse/accents/tirets), on réutilise la fiche
    // canonique au lieu de créer une variante ("Canard colvert" vs "canard Colvert").
    const { data: matches, error: matchErr } = await supabase.rpc('match_animal', {
      p_name: animal.animal_name || animalName,
      p_scientific: animal.scientific_name || null,
    })
    if (matchErr) console.error('match_animal failed', matchErr)
    const existing = Array.isArray(matches) ? matches[0] : matches
    if (existing) {
      animal.animal_name = existing.name || animal.animal_name
      animal.scientific_name = existing.scientific_name || animal.scientific_name
      animal.category = existing.category || animal.category
      animal.rarity = existing.rarity || animal.rarity
    }


    const update: Record<string, unknown> = {
      animal_name: animal.animal_name || animalName,
      scientific_name: animal.scientific_name || null,
      category: animal.category || null,
      description: animal.description || capture.description || null,
      habitat: animal.habitat || null,
      diet: animal.diet || null,
      conservation: animal.conservation || null,
      fun_fact: animal.fun_fact || null,
      rarity: animal.rarity || 'common',
    }
    if (animal.subject_bbox) update.subject_bbox = animal.subject_bbox

    const { error: updErr } = await supabase.from('captures').update(update).eq('id', captureId)
    if (updErr) {
      console.error('capture update failed', updErr)
      return json({ error: 'Mise à jour impossible' }, 500)
    }

    return json({ success: true, animal: update })
  } catch (e) {
    console.error('enrich-capture error', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
