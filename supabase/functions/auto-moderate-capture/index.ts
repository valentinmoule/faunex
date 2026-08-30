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
const AUTO_PROMPT = `Expert naturaliste chargé du contrôle qualité. On te donne une PHOTO, le NOM proposé par l'observateur et sa description. Ta mission : VÉRIFIER le nom, pas deviner.

- name_matches = true UNIQUEMENT si la photo montre sans ambiguïté l'animal nommé (espèce ou race), cohérent avec la description.
- confidence = certitude réelle 0-1 ; > 0,9 seulement si un expert n'hésiterait pas.
- Photo floue, lointaine, partielle, ou espèces ressemblantes possibles (biche/chevreuil, coccinelles, races de chiens, passereaux) → name_matches false, confidence basse.
- AUTHENTICITÉ : seule une VRAIE PHOTO d'animal VIVANT est valide. Invalide (is_real_photo false, name_matches false, confidence 0) : illustration, dessin, logo, mascotte, peinture, rendu 3D, image IA, capture/photo d'écran ou de papier, autocollant, tatouage, peluche, figurine, statue et tout OBJET en forme d'animal (déco, bibelot, déguisement, gonflable, gâteau, graffiti, panneau) → objet_representation ; animal MORT ou préparé (plat, poisson/fruits de mer servis ou en étal, viande, carcasse, trophée, taxidermie, écrasé, insecte épinglé, squelette, coquille vide) → animal_mort_ou_plat. Indices : matériau/couture/socle/yeux peints/posture rigide, aplats sans grain, fond uni, watermark, assiette/couverts/glace/découpe/sang.
- Humain, plante, aucun animal, créature de fiction ou espèce éteinte → name_matches false, confidence 0.
- Au moindre doute sur la nature de l'image : is_real_photo false.
- animal_name : le nom de l'observateur normalisé (orthographe, casse, race si visible), jamais une autre espèce. Nom scientifique = binôme latin réel.
- Rareté (France, 8 paliers) : common commune/quotidienne · uncommon peu commune/fréquente · rare plutôt rare, demande de la chance · very_rare rare/très localisée · ultra_rare menacée ou protégée · illustration_rare épique/quasi-impossible · special_rare mythique · hyper_rare légendaire, le sommet.

Réponds UNIQUEMENT via l'appel de fonction verify_animal.`


/** Seuil de confiance minimal pour valider sans modérateur humain. */
const AUTO_APPROVE_THRESHOLD = 0.9

/** Clé de la tâche de fond (verrou + état de pause en base). */
const JOB_KEY = 'auto_moderate_captures'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  let holdsLock = false

  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')
    const isCron = !!expectedCronSecret && cronSecret === expectedCronSecret

    let callerId: string | null = null
    let isAdmin = isCron

    if (!isCron) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
      const token = authHeader.replace('Bearer ', '')

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
    }

    const body = await req.json().catch(() => ({}))
    const captureId: string | undefined = body?.capture_id
    const batch: boolean = body?.batch === true
    let limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 25)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500)

    // Lot planifié : verrou unique + garde de pause (crédits IA épuisés, etc.).
    if (batch) {
      if (!isAdmin) return json({ error: 'Forbidden' }, 403)
      const { data: mode, error: lockErr } = await supabase.rpc('acquire_background_job', {
        p_job_key: JOB_KEY,
        p_lease_seconds: 600,
      })
      if (lockErr) return json({ error: lockErr.message }, 500)
      if (mode === 'skip') return json({ success: true, skipped: 'already_running', results: [] })
      holdsLock = true
      // En pause : une seule capture de test pour détecter la reprise du service.
      if (mode === 'probe') limit = 1
    }

    // Sélection des captures à examiner.
    let query = supabase
      .from('captures')
      .select('id, user_id, animal_name, scientific_name, description, image_url, location')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })

    if (batch) {
      query = query.limit(limit)
    } else {
      if (!captureId) return json({ error: 'capture_id is required' }, 400)
      query = query.eq('id', captureId).limit(1)
      if (!isAdmin) query = query.eq('user_id', callerId!)
    }

    const { data: pending, error: pendErr } = await query
    if (pendErr) return json({ error: pendErr.message }, 500)
    if (!pending || pending.length === 0) {
      if (holdsLock) {
        await supabase.rpc('release_background_job', { p_job_key: JOB_KEY, p_error: null, p_resume: false })
        holdsLock = false
      }
      return json({ success: true, results: [] })
    }

    const adminActorId = await getAdminActorId(supabase)
    const results: any[] = []
    let blocked: number | null = null

    for (const capture of pending) {
      let result: any
      try {
        result = await examine(supabase, capture, LOVABLE_API_KEY, adminActorId)
      } catch (err) {
        // Toute erreur inattendue laisse la capture en modération manuelle.
        console.error('auto-moderate examine failed', capture.id, String(err))
        await releaseClaim(supabase, capture.id)
        result = { capture_id: capture.id, approved: false, reason: 'examine_error' }
      }
      results.push(result)
      // Disjoncteur : on arrête le lot dès que la passerelle IA nous refuse.
      if (result?.blocked_status) {
        blocked = result.blocked_status
        break
      }
    }


    if (holdsLock) {
      if (blocked === 402 || blocked === 403) {
        await supabase.rpc('pause_background_job', {
          p_job_key: JOB_KEY,
          p_reason: blocked === 402
            ? 'Crédits IA épuisés (402) : auto-modération en pause.'
            : 'IA bloquée par la politique du workspace (403) : auto-modération en pause.',
        })
      } else {
        await supabase.rpc('release_background_job', {
          p_job_key: JOB_KEY,
          p_error: blocked === 429 ? 'Limite de débit IA atteinte (429), reprise à la prochaine exécution.' : null,
          // Un lot réussi après une pause = le service est revenu.
          p_resume: blocked === null,
        })
      }
      holdsLock = false
    }

    return json({
      success: true,
      approved: results.filter((r: any) => r.approved).length,
      rejected: results.filter((r: any) => r.rejected).length,
      paused: blocked === 402 || blocked === 403,
      results,
    })

  } catch (e) {
    console.error('auto-moderate-capture error', e)
    if (holdsLock) {
      await supabase.rpc('release_background_job', {
        p_job_key: JOB_KEY,
        p_error: e instanceof Error ? e.message : 'Erreur inconnue',
        p_resume: false,
      }).catch(() => {})
    }
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500)
  }
})

/**
 * Libère la réservation d'examen d'une capture.
 *
 * Le verrou (`notification_dedupe`) évite deux analyses simultanées, mais en cas
 * d'échec technique il empêcherait aussi toute nouvelle tentative pendant
 * 10 minutes : on le supprime pour que le lot planifié reprenne la capture,
 * qui reste de toute façon visible en modération manuelle.
 */
async function releaseClaim(supabase: any, captureId: string) {
  try {
    await supabase.from('notification_dedupe').delete().eq('key', `auto-moderate-${captureId}`)
  } catch (err) {
    console.error('releaseClaim failed', captureId, String(err))
  }
}


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


  // Anti-doublon d'exécution : le trigger SQL et le lot planifié pouvaient
  // examiner la même capture au même instant (donc deux appels IA et deux
  // notifications). Le verrou atomique en base tranche la course : seul le
  // premier appelant obtient la réservation, valable 10 minutes.
  const { data: claimed, error: claimErr } = await supabase.rpc('try_claim_notification', {
    p_key: `auto-moderate-${capture.id}`,
    p_ttl_seconds: 600,
  })
  if (claimErr) console.error('try_claim_notification failed', claimErr.message)
  if (claimed === false) {
    return { capture_id: capture.id, approved: false, reason: 'already_examined' }
  }


  // Doublon : l'explorateur possède déjà cette espèce → refus immédiat + notification.
  const dup = await findUserDuplicate(supabase, capture.user_id, capture.id, name, capture.scientific_name)
  if (dup) {
    await rejectCapture(supabase, capture, name, 'duplicate', adminActorId, 'duplicate_species')
    return { capture_id: capture.id, approved: false, rejected: true, reason: 'duplicate' }
  }


  const userText = [
    `Nom proposé par l'observateur : "${name}".`,
    capture.scientific_name ? `Nom scientifique proposé : "${capture.scientific_name}".` : null,
    capture.description
      ? `Description de l'observateur : "${String(capture.description).slice(0, 1500)}".`
      : "L'observateur n'a pas fourni de description.",
    capture.location ? `Lieu d'observation : ${capture.location}.` : null,
    'Vérifie si le nom proposé correspond à la photo, puis rédige la fiche.',
  ].filter(Boolean).join('\n')

  const askModel = async (model: string) => {
    try {
      const res = await callGateway(apiKey, model, userText, capture.image_url, 55_000)
      if (!res.ok) {
        console.error('auto-moderate gateway error', model, res.status, await res.text().catch(() => ''))
        // 402 (crédits épuisés) / 403 (bloqué) / 429 (quota) : inutile d'insister.
        if (res.status === 402 || res.status === 403 || res.status === 429) {
          return { verdict: null, blocked: res.status }
        }
        return { verdict: null, blocked: null }
      }
      const data = await res.json()
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
      if (!toolCall) return { verdict: null, blocked: null }
      return { verdict: JSON.parse(toolCall.function.arguments), blocked: null }
    } catch (err) {
      console.error('auto-moderate gateway failure', model, String(err))
      return { verdict: null, blocked: null }
    }
  }

  // UN SEUL appel IA par demande de modération : aucune escalade, aucun second
  // avis. Si le verdict n'est pas concluant, la décision revient à l'humain.
  // Flash Lite 3.1 : vision équivalente ou meilleure que 2.5 Flash pour une
  // fraction du prix. Un seul appel, jamais d'escalade.
  const MODEL = 'google/gemini-3.1-flash-lite'
  const { verdict, blocked: blockedStatus } = await askModel(MODEL)
  const usedModel = verdict ? MODEL : null

  if (!verdict) {
    // Échec technique de l'IA (indisponible, quota, timeout) : la capture doit
    // rester en modération manuelle ET rester réexaminable → on libère le verrou.
    await releaseClaim(supabase, capture.id)
    await logDatasetEvent(supabase, {
      event_type: 'auto_moderation_deferred',
      source: 'auto-moderate-capture',
      capture_id: capture.id,
      user_id: capture.user_id,
      image_url: capture.image_url,
      label_name: name,
      label_scientific_name: capture.scientific_name || null,
      user_description: capture.description || null,
      location: capture.location || null,
      decision_reason: `ai_unavailable:${blockedStatus ?? 'error'}`,
      is_ground_truth: false,
    })
    return { capture_id: capture.id, approved: false, reason: 'ai_unavailable', blocked_status: blockedStatus }
  }








  const confidence = Number(verdict.confidence) || 0
  const matches = verdict.name_matches === true
  const finalName = (verdict.animal_name || name).toString().trim()
  const unknown = norm(finalName) === 'inconnu' || !finalName
  // Authenticité : une illustration / logo / dessin / capture d'écran n'est jamais
  // une capture valide et ne doit jamais passer en auto-approbation.
  const imageType = typeof verdict.image_type === 'string' ? verdict.image_type : null
  const notRealPhoto = verdict.is_real_photo === false || (imageType !== null && imageType !== 'photo_reelle')

  // GARDE-FOU : l'auto-modération VÉRIFIE, elle ne renomme jamais vers une autre
  // espèce. Si l'IA propose un binôme latin (ou un nom) différent de celui de
  // l'observateur, sa correction n'est PAS appliquée : la capture part en
  // modération humaine avec le nom de l'observateur intact.
  const userSci = norm(capture.scientific_name)
  const aiSci = norm(verdict.scientific_name)
  const sciConflict = !!userSci && !!aiSci && userSci !== aiSci
  const nameConflict = norm(finalName) !== norm(name) && !norm(finalName).includes(norm(name)) && !norm(name).includes(norm(finalName))
  const speciesOverride = sciConflict || (!userSci && nameConflict)


  // Non-respect des règles : image non photographique, objet, animal mort,
  // humain, espèce fictive/éteinte → refus ferme + notification.
  const ruleBreach = notRealPhoto || (verdict.name_matches === false && confidence === 0)

  if (!matches || unknown || notRealPhoto || speciesOverride || confidence < AUTO_APPROVE_THRESHOLD) {
    const decisionReason = notRealPhoto
      ? `not_a_real_photo:${imageType ?? 'unknown'}`
      : speciesOverride
        ? `species_override_blocked:${verdict.scientific_name ?? verdict.animal_name ?? 'inconnu'}`
        : (verdict.reason ?? (ruleBreach ? 'rule_breach' : 'needs_human'))


    // Dataset : décision automatique de refus, ou renvoi vers la modération humaine.
    await logDatasetEvent(supabase, {
      event_type: ruleBreach ? 'moderation_rejected' : 'auto_moderation_deferred',
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
      decision_reason: decisionReason,
      is_ground_truth: false,
    })

    if (ruleBreach) {
      await rejectCapture(supabase, capture, name, 'not_identifiable', adminActorId, decisionReason)
      return {
        capture_id: capture.id,
        approved: false,
        rejected: true,
        reason: notRealPhoto ? 'not_a_real_photo' : 'rule_breach',
        image_type: imageType,
        confidence,
      }
    }

    return {
      capture_id: capture.id,
      approved: false,
      reason: 'needs_human',
      image_type: imageType,
      confidence,
      ai_note: verdict.reason ?? null,
    }

  }

  // Le nom validé peut différer légèrement (race précisée) : on re-vérifie le doublon.
  const dup2 = await findUserDuplicate(
    supabase, capture.user_id, capture.id, finalName, verdict.scientific_name || null,
  )
  if (dup2) {
    await rejectCapture(supabase, capture, finalName, 'duplicate', adminActorId, 'duplicate_species')
    return { capture_id: capture.id, approved: false, rejected: true, reason: 'duplicate' }
  }


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
    // La capture reste 'pending_review' (modération manuelle) et redevient
    // réexaminable au prochain passage.
    await releaseClaim(supabase, capture.id)
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
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
      'x-cron-secret': Deno.env.get('CRON_SECRET') ?? '',
    },
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

/**
 * Refus automatique : notification (in-app + e-mail/push) puis suppression de la
 * capture, exactement comme un rejet effectué par un modérateur humain.
 */
async function rejectCapture(
  supabase: any,
  capture: any,
  animalName: string,
  reason: 'duplicate' | 'not_identifiable',
  adminActorId: string | null,
  decisionReason: string,
) {
  if (adminActorId) {
    const { error } = await supabase.from('notifications').insert({
      user_id: capture.user_id,
      type: 'capture_rejected',
      actor_id: adminActorId,
      comment_text: animalName,
    })
    if (error) console.error('auto-reject notification failed', error.message)
  }

  const { error: notifErr } = await supabase.functions.invoke('notify-moderation-decision', {
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
      'x-cron-secret': Deno.env.get('CRON_SECRET') ?? '',
    },
    body: {
      user_id: capture.user_id,
      decision: 'rejected',
      animal_name: animalName,
      capture_id: capture.id,
      reason,
    },
  })
  if (notifErr) console.error('notify-moderation-decision (reject) failed', notifErr)

  const { error: delErr } = await supabase.from('captures').delete().eq('id', capture.id)
  if (delErr) console.error('auto-reject delete failed', capture.id, delErr.message, decisionReason)
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
      // Pas de « réflexion » facturée : la vérification est un contrôle guidé
      // par un schéma, et la sortie est bornée.
      reasoning_effort: 'low',
      max_tokens: 900,
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
                is_real_photo: {
                  type: 'boolean',
                  description: "true seulement si l'image est une photographie réelle d'un animal vivant (grain photo, éclairage naturel, profondeur de champ). false pour illustration, dessin, logo, icône, mascotte, peinture, rendu 3D, image IA, capture d'écran, photo d'écran, autocollant, peluche, figurine, statue ou tout objet représentant un animal.",
                },
                image_type: {
                  type: 'string',
                  enum: ['photo_reelle', 'illustration', 'dessin', 'logo_icone', 'peinture', 'rendu_3d', 'image_generee_ia', 'capture_ecran', 'photo_ecran_ou_papier', 'jouet_peluche_figurine', 'objet_representation', 'animal_mort_ou_plat', 'autre'],
                  description: "Nature réelle de l'image.",
                },
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
                rarity: { type: 'string', enum: ['common', 'uncommon', 'rare', 'very_rare', 'ultra_rare', 'illustration_rare', 'special_rare', 'hyper_rare'] },
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
              required: ['is_real_photo', 'image_type', 'name_matches', 'confidence', 'reason', 'animal_name', 'scientific_name', 'category', 'description', 'habitat', 'diet', 'conservation', 'fun_fact', 'rarity'],
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
