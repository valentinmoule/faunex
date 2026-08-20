import { createClient } from 'npm:@supabase/supabase-js@2'
import { logDatasetEvent } from '../_shared/dataset.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Pré-modération automatique.
 *
 * Beaucoup d'explorateurs envoient un nom et une description parfaitement
 * corrects. Cette fonction demande à l'IA de VÉRIFIER (et non de deviner) le
 * nom proposé sur la photo : si elle est catégorique, la capture est enrichie
 * et approuvée sans intervention humaine. Au moindre doute (photo ambiguë,
 * nom incompatible, doublon, espèce fictive/éteinte, humain), la capture reste
 * en modération manuelle.
 */
const AUTO_PROMPT = `Tu es un expert naturaliste (zoologie, ornithologie, herpétologie, entomologie, cynologie, félinologie) chargé du CONTRÔLE QUALITÉ d'une plateforme de collection d'animaux.

On te donne : une PHOTO, le NOM proposé par l'observateur et sa DESCRIPTION.

Ta mission n'est PAS de deviner l'espèce : c'est de VÉRIFIER si le nom proposé est correct, puis de rédiger la fiche.

Règles de vérification (sois strict) :
- name_matches = true UNIQUEMENT si la photo montre sans ambiguïté l'animal nommé (espèce ou race), en cohérence avec la description.
- confidence = ta certitude réelle (0 à 1). N'utilise > 0.9 que si un expert n'hésiterait pas une seconde.
- Si la photo est floue, trop lointaine, partielle, si plusieurs espèces ressemblantes sont possibles (biche/chevreuil, coccinelle asiatique/autochtone, races de chiens, passereaux…) ou si l'animal n'est pas visible : name_matches = false et confidence basse.
- Si la photo montre un humain, un objet, une peluche, une plante ou aucun animal : name_matches = false, confidence 0.
- Espèces réelles et vivantes uniquement : aucune créature de fiction (dragon, licorne, phénix…) ni espèce éteinte (dodo, mammouth, dinosaure…). Dans ce cas name_matches = false, confidence 0.
- animal_name : reprends le nom de l'observateur normalisé (orthographe, casse, race précise si visible). Ne change jamais d'espèce.
- Le nom scientifique doit être un binôme latin réel.

## Rareté (probabilité d'observation en Europe/France)
- common : quotidien ou fréquent
- rare : demande patience ou chance
- epic : très rare, espèce vulnérable ou en danger
- mythic : quasi-impossible, en danger critique

Réponds UNIQUEMENT via l'appel de fonction verify_animal.`

/** Seuil de confiance minimal pour valider sans modérateur humain. */
const AUTO_APPROVE_THRESHOLD = 0.9

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const token = authHeader.replace('Bearer ', '')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    let callerId: string | null = null
    let isAdmin = false
    if (token === serviceKey) {
      isAdmin = true
    } else {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
      if (claimsError || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
      callerId = claimsData.claims.sub as string
      const { data: admin } = await supabase.rpc('has_role', { _user_id: callerId, _role: 'admin' })
      isAdmin = admin === true
    }

    const body = await req.json().catch(() => ({}))
    const captureId: string | undefined = body?.capture_id
    const batch: boolean = body?.batch === true
    const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 25)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500)

    // Sélection des captures à examiner.
    let query = supabase
      .from('captures')
      .select('id, user_id, animal_name, scientific_name, description, image_url, location')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })

    if (batch) {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      query = query.limit(limit)
    } else {
      if (!captureId) return json({ error: 'capture_id is required' }, 400)
      query = query.eq('id', captureId).limit(1)
      if (!isAdmin) query = query.eq('user_id', callerId!)
    }

    const { data: pending, error: pendErr } = await query
    if (pendErr) return json({ error: pendErr.message }, 500)
    if (!pending || pending.length === 0) return json({ success: true, results: [] })

    const adminActorId = await getAdminActorId(supabase)
    const results: unknown[] = []

    for (const capture of pending) {
      const result = await examine(supabase, capture, LOVABLE_API_KEY, adminActorId)
      results.push(result)
    }

    return json({
      success: true,
      approved: results.filter((r: any) => r.approved).length,
      results,
    })
  } catch (e) {
    console.error('auto-moderate-capture error', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500)
  }
})

async function examine(
  supabase: any,
  capture: any,
  apiKey: string,
  adminActorId: string | null,
) {
  const name = (capture.animal_name || '').toString().trim()
  if (!name || !capture.image_url) {
    return { capture_id: capture.id, approved: false, reason: 'missing_data' }
  }

  // Doublon : l'explorateur possède déjà cette espèce → décision humaine.
  const dup = await findUserDuplicate(supabase, capture.user_id, capture.id, name, capture.scientific_name)
  if (dup) return { capture_id: capture.id, approved: false, reason: 'duplicate' }

  const userText = [
    `Nom proposé par l'observateur : "${name}".`,
    capture.scientific_name ? `Nom scientifique proposé : "${capture.scientific_name}".` : null,
    capture.description
      ? `Description de l'observateur : "${String(capture.description).slice(0, 1500)}".`
      : "L'observateur n'a pas fourni de description.",
    capture.location ? `Lieu d'observation : ${capture.location}.` : null,
    'Vérifie si le nom proposé correspond à la photo, puis rédige la fiche.',
  ].filter(Boolean).join('\n')

  let verdict: any = null
  let usedModel: string | null = null
  let blockedStatus: number | null = null
  // Modération : on privilégie le modèle le plus performant, avec replis.
  for (const model of ['google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite']) {
    try {
      const res = await callGateway(apiKey, model, userText, capture.image_url, 55_000)
      if (!res.ok) {
        console.error('auto-moderate gateway error', model, res.status, await res.text().catch(() => ''))
        // 402 (crédits épuisés) / 403 (bloqué) / 429 (quota) : inutile d'insister.
        if (res.status === 402 || res.status === 403 || res.status === 429) {
          blockedStatus = res.status
          break
        }
        continue
      }
      const data = await res.json()
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
      if (!toolCall) continue
      verdict = JSON.parse(toolCall.function.arguments)
      usedModel = model
      break
    } catch (err) {
      console.error('auto-moderate gateway failure', model, String(err))
    }
  }

  if (!verdict) {
    return { capture_id: capture.id, approved: false, reason: 'ai_unavailable', blocked_status: blockedStatus }
  }



  const confidence = Number(verdict.confidence) || 0
  const matches = verdict.name_matches === true
  const finalName = (verdict.animal_name || name).toString().trim()
  const unknown = norm(finalName) === 'inconnu' || !finalName

  if (!matches || unknown || confidence < AUTO_APPROVE_THRESHOLD) {
    // Dataset : prédiction non concluante → la capture reste en modération humaine.
    await logDatasetEvent(supabase, {
      event_type: 'auto_moderation_deferred',
      source: 'auto-moderate-capture',
      model: usedModel,
      capture_id: capture.id,
      user_id: capture.user_id,
      image_url: capture.image_url,
      predicted_name: verdict.animal_name || null,
      predicted_scientific_name: verdict.scientific_name || null,
      predicted_category: verdict.category || null,
      predicted_rarity: verdict.rarity || null,
      confidence,
      label_name: name,
      label_scientific_name: capture.scientific_name || null,
      user_description: capture.description || null,
      location: capture.location || null,
      decision_reason: verdict.reason ?? 'needs_human',
      is_ground_truth: false,
    })
    return {
      capture_id: capture.id,
      approved: false,
      reason: 'needs_human',
      confidence,
      ai_note: verdict.reason ?? null,
    }
  }

  // Le nom validé peut différer légèrement (race précisée) : on re-vérifie le doublon.
  const dup2 = await findUserDuplicate(
    supabase, capture.user_id, capture.id, finalName, verdict.scientific_name || null,
  )
  if (dup2) return { capture_id: capture.id, approved: false, reason: 'duplicate' }

  const update: Record<string, unknown> = {
    animal_name: finalName,
    scientific_name: verdict.scientific_name || null,
    category: verdict.category || null,
    description: verdict.description || capture.description || null,
    habitat: verdict.habitat || null,
    diet: verdict.diet || null,
    conservation: verdict.conservation || null,
    fun_fact: verdict.fun_fact || null,
    rarity: verdict.rarity || 'common',
    status: 'approved',
  }
  if (verdict.subject_bbox) update.subject_bbox = verdict.subject_bbox

  const { error: updErr } = await supabase.from('captures').update(update).eq('id', capture.id)
  if (updErr) {
    console.error('auto-approve update failed', updErr)
    return { capture_id: capture.id, approved: false, reason: 'db_error', detail: updErr.message }
  }

  // Dataset : validation automatique à haute confiance → vérité terrain.
  await logDatasetEvent(supabase, {
    event_type: 'auto_moderation_approved',
    source: 'auto-moderate-capture',
    model: usedModel,
    capture_id: capture.id,
    user_id: capture.user_id,
    image_url: capture.image_url,
    predicted_name: verdict.animal_name || null,
    predicted_scientific_name: verdict.scientific_name || null,
    predicted_category: verdict.category || null,
    predicted_rarity: verdict.rarity || null,
    confidence,
    subject_bbox: verdict.subject_bbox ?? null,
    label_name: finalName,
    label_scientific_name: verdict.scientific_name || null,
    label_category: verdict.category || null,
    label_rarity: verdict.rarity || 'common',
    user_description: capture.description || null,
    location: capture.location || null,
    decision_reason: verdict.reason ?? null,
    is_ground_truth: true,
  })

  if (adminActorId) {
    await supabase.from('notifications').insert({
      user_id: capture.user_id,
      type: 'capture_approved',
      actor_id: adminActorId,
      capture_id: capture.id,
    })
  }

  const { error: notifErr } = await supabase.functions.invoke('notify-moderation-decision', {
    body: {
      user_id: capture.user_id,
      decision: 'approved',
      animal_name: finalName,
      capture_id: capture.id,
    },
  })
  if (notifErr) console.error('notify-moderation-decision failed', notifErr)

  return { capture_id: capture.id, approved: true, animal_name: finalName, confidence }
}

function callGateway(
  apiKey: string,
  model: string,
  userText: string,
  imageUrl: string,
  timeoutMs: number,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    signal: controller.signal,
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: AUTO_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'verify_animal',
            description: "Vérifie le nom proposé par l'observateur et rédige la fiche",
            parameters: {
              type: 'object',
              properties: {
                name_matches: {
                  type: 'boolean',
                  description: 'true seulement si la photo montre sans ambiguïté l\'animal nommé.',
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Certitude réelle de la vérification (0 à 1).',
                },
                reason: {
                  type: 'string',
                  description: 'Justification courte du verdict (indices retenus ou source du doute).',
                },
                animal_name: { type: 'string', description: 'Nom commun français normalisé.' },
                scientific_name: { type: 'string', description: 'Binôme latin réel (genre + espèce).' },
                category: {
                  type: 'string',
                  enum: ['Mammifères', 'Oiseaux', 'Reptiles', 'Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Crustacés', 'Mollusques'],
                },
                description: { type: 'string', description: '2-3 phrases : physique distinctif et comportement.' },
                habitat: { type: 'string' },
                diet: { type: 'string' },
                conservation: { type: 'string', description: "Statut UICN : LC, NT, VU, EN, CR ou 'Domestique'." },
                fun_fact: { type: 'string' },
                rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'mythic'] },
                subject_bbox: {
                  type: 'object',
                  description: 'Boîte englobante de l\'animal, normalisée 0..1. Omets si aucun animal visible.',
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
              required: ['name_matches', 'confidence', 'reason', 'animal_name', 'scientific_name', 'category', 'description', 'habitat', 'diet', 'conservation', 'fun_fact', 'rarity'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'verify_animal' } },
    }),
  }).finally(() => clearTimeout(timer))
}

/** Un admin sert d'auteur pour la notification in-app (actor_id non nul). */
async function getAdminActorId(supabase: any): Promise<string | null> {
  const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
  return data?.[0]?.user_id ?? null
}

const norm = (v: string | null | undefined) =>
  (v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const SHARED_BINOMIALS = new Set([
  'canis lupus familiaris', 'canis familiaris', 'canis lupus',
  'felis catus', 'felis silvestris catus',
  'equus caballus', 'equus ferus caballus', 'equus asinus',
  'bos taurus', 'bos primigenius taurus', 'ovis aries', 'capra hircus',
  'sus scrofa domesticus', 'gallus gallus domesticus', 'gallus gallus',
  'oryctolagus cuniculus', 'anas platyrhynchos domesticus',
  'cavia porcellus', 'mesocricetus auratus', 'columba livia domestica',
])

const isSpeciesBinomial = (sci: string | null | undefined) => {
  const s = norm(sci)
  if (!s) return false
  if (SHARED_BINOMIALS.has(s)) return false
  const parts = s.split(' ').filter(Boolean)
  if (parts.length < 2) return false
  if (/(idae|inae|oidea|aceae|iformes|ptera|morpha)$/.test(parts[0])) return false
  return true
}

async function findUserDuplicate(
  supabase: any,
  userId: string,
  currentCaptureId: string,
  name: string,
  scientific: string | null,
) {
  const { data, error } = await supabase
    .from('captures')
    .select('id, animal_name, scientific_name')
    .eq('user_id', userId)
    .eq('status', 'approved')
  if (error) {
    console.error('duplicate lookup failed', error)
    return null
  }
  const n = norm(name)
  const s = isSpeciesBinomial(scientific) ? norm(scientific) : ''
  return (data || []).find((c: any) =>
    c.id !== currentCaptureId &&
    ((n && norm(c.animal_name) === n) ||
      (s && isSpeciesBinomial(c.scientific_name) && norm(c.scientific_name) === s))
  ) || null
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
