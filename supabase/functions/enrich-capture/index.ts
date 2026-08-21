import { createClient } from 'npm:@supabase/supabase-js@2'
import { logDatasetEvent } from '../_shared/dataset.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Tu es un expert naturaliste de renommée mondiale (zoologie, ornithologie, herpétologie, entomologie, cynologie, félinologie).

On te donne TROIS sources d'information, toutes essentielles :
1. La PHOTO de la capture.
2. Le NOM proposé par l'observateur (puis validé par un modérateur humain).
3. La DESCRIPTION écrite par l'observateur : elle contient souvent des indices décisifs que la photo ne montre pas (taille réelle, couleurs, chant/cri, comportement, milieu, saison, région, nombre d'individus, race supposée, contexte de la rencontre).

Méthode obligatoire :
- Lis d'abord la description et le nom proposé, puis confronte-les à la photo. La description est une preuve de terrain : utilise-la activement pour trancher entre espèces ressemblantes (biche vs chevreuil, coccinelle asiatique vs autochtone, races de chiens/chats/vaches, etc.).
- Le nom proposé fait autorité tant qu'il est cohérent avec la photo et la description : normalise-le en français correct (orthographe, majuscule) et précise la race pour un animal domestique quand la photo ou la description la révèle.
- Si la description apporte une précision plus fine que le nom (ex. nom "oiseau" + description "petit oiseau jaune au chant flûté dans les roseaux"), affine le nom vers l'espèce la plus précise et cohérente.
- Si le nom proposé est clairement incompatible avec la photo ET la description, retiens l'espèce que la photo et la description désignent conjointement, et explique le choix dans la description de la fiche.
- N'invente jamais un détail absent de la photo et de la description : en cas d'incertitude, reste au niveau taxonomique le plus précis dont tu es sûr.

Ta mission : produire une fiche d'espèce complète et fiable.


## Évaluation de la rareté (probabilité d'observation en Europe/France)
- **common** : observation quotidienne ou fréquente (pigeon, moineau, merle, chat européen, Labrador, hérisson, écureuil, carpe, canard colvert)
- **rare** : observation nécessitant patience ou chance (martin-pêcheur, hermine, Bengal, héron)
- **epic** : très rare, espèce vulnérable ou en danger (lynx, gypaète, loutre, ours brun, aigle royal)
- **mythic** : quasi-impossible, espèce en danger critique (loup gris en France, phoque moine)

## Espèces réelles uniquement
Seules les espèces réelles et actuellement vivantes existent dans Faunex. Aucune créature imaginaire ou de fiction (dragon, licorne, phénix, kraken, sirène, yéti, Pokémon…) et aucune espèce éteinte ou préhistorique (dodo, tyrannosaure et autres dinosaures, mammouth, thylacine, grand pingouin, aurochs…) ne doit être produite. Le nom scientifique doit être un binôme latin réel et vérifiable, jamais inventé.
Les espèces réelles portant "dragon" dans leur nom commun (Dragon de Komodo, Dragon barbu, Dragon volant) restent valides.

Si le nom donné ne correspond à aucun animal réel et vivant (objet, peluche, créature de fiction, espèce éteinte, blague), utilise l'animal réel le plus proche visible sur la photo ; si la photo ne montre aucun animal réel, réponds animal_name "Inconnu", rarity "common", category la plus proche, et reste factuel.

Réponds UNIQUEMENT via l'appel de fonction enrich_animal.`

const FORCE_NAME_PROMPT = `Tu es un expert naturaliste de renommée mondiale (zoologie, ornithologie, herpétologie, entomologie, cynologie, félinologie).

Un modérateur humain a DÉJÀ validé l'identification. Le nom d'animal qui t'est donné fait autorité absolue : tu ne dois PAS le remettre en question, ni le remplacer, ni l'affiner vers une autre espèce. Aucune reconnaissance d'image n'est demandée.

Ta seule mission : rédiger la fiche documentaire de cette espèce (nom scientifique, catégorie, description, habitat, régime, statut de conservation, anecdote, rareté).

Règles :
- Reprends EXACTEMENT le nom commun fourni dans animal_name (tu peux uniquement corriger l'orthographe évidente et la casse, jamais changer d'espèce ou de race).
- Le nom scientifique doit être le binôme latin réel de cette espèce (pour une race domestique, le binôme de l'espèce domestique).
- La description de l'observateur peut préciser la race, la couleur ou le contexte : intègre-la si elle est cohérente.
- N'invente aucun fait : reste factuel et vérifiable.

## Évaluation de la rareté (probabilité d'observation en Europe/France)
- **common** : observation quotidienne ou fréquente
- **rare** : observation nécessitant patience ou chance
- **epic** : très rare, espèce vulnérable ou en danger
- **mythic** : quasi-impossible, espèce en danger critique

## Espèces réelles uniquement
Aucune créature imaginaire ni espèce éteinte. Si le nom fourni ne correspond à aucun animal réel et vivant, réponds animal_name "Inconnu".

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
    // Nom scientifique saisi par le modérateur (indice fort ou autorité en mode forcé).
    const overrideScientific: string | null =
      typeof body?.scientific_name === 'string' && body.scientific_name.trim()
        ? body.scientific_name.trim()
        : null
    // 'high' fait basculer sur un modèle plus performant quand le modèle léger échoue.
    const quality: string = body?.quality === 'high' ? 'high' : 'standard'
    const skipDuplicateCheck: boolean = body?.skip_duplicate_check === true
    // apply=true : écriture réelle de la fiche (confirmation du modérateur).
    const apply: boolean = body?.apply === true
    // force_name=true : le nom de l'observateur fait autorité. L'IA ne fait aucune
    // reconnaissance d'image, elle rédige seulement la fiche documentaire.
    const forceName: boolean = body?.force_name === true
    const providedAnimal = body?.animal && typeof body.animal === 'object' ? body.animal : null
    if (!captureId) return json({ error: 'capture_id is required' }, 400)

    // Confirmation avec la fiche déjà prévisualisée : on l'écrit sans rappeler l'IA.
    if (apply && providedAnimal) {
      const fields = [
        'animal_name', 'scientific_name', 'category', 'description',
        'habitat', 'diet', 'conservation', 'fun_fact', 'rarity', 'subject_bbox',
      ]
      const payload: Record<string, unknown> = {}
      for (const k of fields) {
        if (providedAnimal[k] !== undefined) payload[k] = providedAnimal[k]
      }
      if (!payload.animal_name) return json({ error: 'animal_name manquant', code: 'bad_request' }, 400)
      const { error: applyErr } = await supabase.from('captures').update(payload).eq('id', captureId)
      if (applyErr) {
        console.error('apply update failed', applyErr)
        const isUnique = /duplicate key|unique/i.test(applyErr.message || '')
        return json({
          error: isUnique
            ? "Conflit d'unicité : cette espèce existe déjà pour cet explorateur."
            : `Mise à jour impossible : ${applyErr.message}`,
          code: isUnique ? 'duplicate' : 'db_error',
          detail: applyErr.message,
        }, isUnique ? 409 : 500)
      }
      // Dataset : fiche confirmée par un modérateur humain → vérité terrain.
      const { data: applied } = await supabase
        .from('captures')
        .select('user_id, image_url, description, location')
        .eq('id', captureId)
        .maybeSingle()
      await logDatasetEvent(supabase, {
        event_type: 'moderation_approved',
        source: 'enrich-capture',
        capture_id: captureId,
        user_id: applied?.user_id ?? null,
        image_url: applied?.image_url ?? null,
        label_name: (payload.animal_name as string) ?? null,
        label_scientific_name: (payload.scientific_name as string) ?? null,
        label_category: (payload.category as string) ?? null,
        label_rarity: (payload.rarity as string) ?? null,
        subject_bbox: payload.subject_bbox ?? null,
        user_description: applied?.description ?? null,
        location: applied?.location ?? null,
        moderator_id: callerId,
        forced_name: forceName,
        is_ground_truth: true,
      })
      return json({ success: true, animal: payload })
    }


    const { data: capture, error: capErr } = await supabase
      .from('captures')
      .select('id, animal_name, description, image_url, location, user_id')
      .eq('id', captureId)
      .maybeSingle()

    if (capErr || !capture) return json({ error: 'Capture introuvable' }, 404)

    const animalName = (overrideName || capture.animal_name || '').toString().trim()
    if (!animalName) return json({ error: 'Nom d\'animal manquant' }, 400)

    // Doublon : l'utilisateur possède déjà cette espèce (une capture par espèce).
    if (!skipDuplicateCheck) {
      const dup = await findUserDuplicate(supabase, capture.user_id, captureId, animalName, overrideScientific)
      if (dup) {
        return json({
          error: `L'explorateur possède déjà « ${dup.animal_name} »${dup.scientific_name ? ` (${dup.scientific_name})` : ''} dans son bestiaire — même espèce que « ${animalName} ».`,
          code: 'duplicate',
          duplicate: dup,
        }, 409)
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY manquant' }, 500)

    const userText = forceName
      ? [
          `Nom d'animal validé par le modérateur (autorité absolue, à conserver tel quel) : "${animalName}".`,
          overrideScientific
            ? `Nom scientifique imposé par le modérateur (autorité absolue, à conserver tel quel) : "${overrideScientific}".`
            : null,
          capture.description
            ? `Description de l'observateur (contexte utile pour la fiche) : "${String(capture.description).slice(0, 1500)}".`
            : null,
          capture.location ? `Lieu d'observation : ${capture.location}.` : null,
          "Rédige la fiche documentaire complète de cette espèce sans remettre en cause le nom.",
        ].filter(Boolean).join('\n')
      : [
          `Nom proposé par l'observateur (validé par le modérateur) : "${animalName}".`,
          overrideScientific
            ? `Nom scientifique proposé par le modérateur (indice très fiable) : "${overrideScientific}".`
            : null,
          capture.description
            ? `Description de l'observateur (indices de terrain à prendre en compte pour l'identification) : "${String(capture.description).slice(0, 1500)}".`
            : "L'observateur n'a pas fourni de description : appuie-toi uniquement sur la photo et le nom proposé.",
          capture.location ? `Lieu d'observation : ${capture.location}.` : null,
          "Croise la photo, le nom proposé et la description avant de conclure, puis produis la fiche complète de cet animal et la boîte englobante du sujet sur la photo.",
        ].filter(Boolean).join('\n')

    const content: unknown[] = [{ type: 'text', text: userText }]
    // En mode forcé on n'envoie pas la photo : pas de reconnaissance d'image, coût réduit.
    if (!forceName && capture.image_url) {
      content.push({ type: 'image_url', image_url: { url: capture.image_url } })
    }


    // Le gateway peut stagner (503 amont, modèle lent) : on borne chaque appel et on
    // retente avec un modèle de repli plutôt que de laisser le modérateur attendre.
    // La modération privilégie la précision : chaîne haute qualité par défaut.
    const models = quality === 'low'
      ? ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite']
      : ['google/gemini-2.5-pro', 'google/gemini-2.5-flash']

    const callGateway = async (model: string, timeoutMs: number) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        return await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          signal: controller.signal,
          method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: forceName ? FORCE_NAME_PROMPT : SYSTEM_PROMPT },
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
      } finally {
        clearTimeout(timer)
      }
    }

    let response: Response | null = null
    let lastStatus = 0
    let lastDetail = ''
    let timedOut = false

    for (let i = 0; i < models.length; i++) {
      try {
        const res = await callGateway(models[i], 55_000)
        if (res.ok) { response = res; break }
        lastStatus = res.status
        lastDetail = await res.text().catch(() => '')
        if (res.status === 429) {
          return json({ error: 'Trop de requêtes IA, réessaye dans un moment.', code: 'ai_rate_limited' }, 429)
        }
        if (res.status === 402) {
          return json({ error: 'Crédits IA épuisés.', code: 'ai_no_credits' }, 402)
        }
        console.error('AI gateway error', models[i], res.status, lastDetail)
      } catch (err) {
        timedOut = true
        console.error('AI gateway timeout/abort', models[i], String(err))
      }
    }

    if (!response) {
      return json({
        error: timedOut
          ? "Le modèle IA n'a pas répondu à temps (photo trop lourde ou service saturé). Réessaye."
          : `Le service IA est momentanément indisponible (${lastStatus}). Réessaye dans quelques instants.`,
        code: timedOut ? 'ai_timeout' : 'ai_error',
        model_used: quality,
        can_retry_high: quality !== 'high',
        detail: lastDetail.slice(0, 400),
      }, timedOut ? 504 : 502)
    }


    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      // Le modèle n'a pas rempli la fiche : souvent une photo ambiguë. Un modèle
      // plus performant peut débloquer la situation (quality: 'high').
      return json({
        error: quality === 'high'
          ? "Le modèle avancé n'a pas réussi à produire la fiche (photo trop ambiguë ?)."
          : "Le modèle léger n'a pas réussi à produire la fiche.",
        code: 'ai_no_result',
        model_used: quality,
        can_retry_high: quality !== 'high',
      }, 422)
    }

    const animal = JSON.parse(toolCall.function.arguments)

    // Mode forcé : le nom du modérateur/observateur prime sur toute reformulation IA.
    if (forceName) {
      animal.animal_name = animalName
      if (overrideScientific) animal.scientific_name = overrideScientific
    }

    // Déduplication : si l'espèce existe déjà dans le bestiaire (nom commun OU nom
    // scientifique, insensible à la casse/accents/tirets), on réutilise la fiche
    // canonique au lieu de créer une variante ("Canard colvert" vs "canard Colvert").
    const { data: matches, error: matchErr } = await supabase.rpc('match_animal', {
      p_name: animal.animal_name || animalName,
      p_scientific: animal.scientific_name || null,
    })
    if (matchErr) console.error('match_animal failed', matchErr)
    const existing = Array.isArray(matches) ? matches[0] : matches
    // Races domestiques : même binôme latin pour des races différentes, on ne doit
    // pas fusionner un Épagneul picard avec un Braque d'Auvergne.
    const sharedBinomial = SHARED_BINOMIALS.has(norm(existing?.scientific_name))
    const sameCommonName = norm(existing?.name) === norm(animal.animal_name || animalName)
    if (existing && (!sharedBinomial || sameCommonName)) {
      // En mode forcé, on n'adopte le nom canonique que s'il désigne bien le même nom.
      if (!forceName || norm(existing.name) === norm(animalName)) {
        animal.animal_name = existing.name || animal.animal_name
      }
      // En mode forcé, le binôme saisi par le modérateur reste prioritaire.
      if (!(forceName && overrideScientific)) {
        animal.scientific_name = existing.scientific_name || animal.scientific_name
      }
      animal.category = existing.category || animal.category
      animal.rarity = existing.rarity || animal.rarity
    }



    // Second contrôle avec le nom canonique retenu par l'IA / le bestiaire.
    if (!skipDuplicateCheck) {
      const dup = await findUserDuplicate(
        supabase, capture.user_id, captureId,
        animal.animal_name || animalName, animal.scientific_name || null,
      )
      if (dup) {
        return json({
          error: `L'explorateur possède déjà « ${dup.animal_name} »${dup.scientific_name ? ` (${dup.scientific_name})` : ''} dans son bestiaire — même espèce que « ${animal.animal_name || animalName} »${animal.scientific_name ? ` (${animal.scientific_name})` : ''}.`,
          code: 'duplicate',
          duplicate: dup,
        }, 409)
      }
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

    // Prévisualisation : on ne touche PAS à la capture. Le nom et la description de
    // l'utilisateur restent intacts si le modérateur annule. L'écriture n'a lieu
    // qu'à la confirmation (apply: true).
    if (!apply) {
      return json({ success: true, preview: true, animal: update })
    }

    const { error: updErr } = await supabase.from('captures').update(update).eq('id', captureId)
    if (updErr) {
      console.error('capture update failed', updErr)
      const isUnique = /duplicate key|unique/i.test(updErr.message || '')
      return json({
        error: isUnique
          ? "Conflit d'unicité : cette espèce existe déjà pour cet explorateur."
          : `Mise à jour impossible : ${updErr.message}`,
        code: isUnique ? 'duplicate' : 'db_error',
        detail: updErr.message,
      }, isUnique ? 409 : 500)
    }

    await logDatasetEvent(supabase, {
      event_type: 'moderation_approved',
      source: 'enrich-capture',
      capture_id: captureId,
      user_id: capture.user_id,
      image_url: capture.image_url,
      predicted_name: animal.animal_name || null,
      predicted_scientific_name: animal.scientific_name || null,
      predicted_category: animal.category || null,
      predicted_rarity: animal.rarity || null,
      subject_bbox: animal.subject_bbox ?? null,
      label_name: (update.animal_name as string) ?? null,
      label_scientific_name: (update.scientific_name as string) ?? null,
      label_category: (update.category as string) ?? null,
      label_rarity: (update.rarity as string) ?? null,
      user_description: capture.description || null,
      location: capture.location || null,
      moderator_id: callerId,
      forced_name: forceName,
      is_ground_truth: true,
    })

    return json({ success: true, animal: update })

  } catch (e) {
    console.error('enrich-capture error', e)
    return json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, 500)
  }
})

const norm = (v: string | null | undefined) =>
  (v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Espèces domestiques : toutes les races partagent le même binôme latin
 * (Épagneul picard et Braque d'Auvergne = Canis lupus familiaris). Le nom
 * scientifique ne peut donc pas servir à détecter un doublon pour elles.
 */
const SHARED_BINOMIALS = new Set([
  'canis lupus familiaris', 'canis familiaris', 'canis lupus',
  'felis catus', 'felis silvestris catus',
  'equus caballus', 'equus ferus caballus', 'equus asinus',
  'bos taurus', 'bos primigenius taurus', 'ovis aries', 'capra hircus',
  'sus scrofa domesticus', 'gallus gallus domesticus', 'gallus gallus',
  'oryctolagus cuniculus', 'anas platyrhynchos domesticus',
  'cavia porcellus', 'mesocricetus auratus', 'columba livia domestica',
])

/**
 * Un nom scientifique n'identifie une espèce que s'il est un vrai binôme
 * (genre + épithète). Beaucoup de fiches portent un rang supérieur
 * (Araneae, Coleoptera, Cicadidae…) partagé par des milliers d'espèces
 * différentes : s'en servir pour détecter un doublon créait de faux positifs.
 */
const isSpeciesBinomial = (sci: string | null | undefined) => {
  const s = norm(sci)
  if (!s) return false
  if (SHARED_BINOMIALS.has(s)) return false
  const parts = s.split(' ').filter(Boolean)
  if (parts.length < 2) return false
  // Rangs supra-spécifiques : familles, sous-familles, super-familles, ordres…
  if (/(idae|inae|oidea|aceae|iformes|ptera|morpha)$/.test(parts[0])) return false
  return true
}

/** Retourne la capture approuvée existante de la même espèce pour cet explorateur. */
async function findUserDuplicate(
  supabase: any,
  userId: string,
  currentCaptureId: string,
  name: string,
  scientific: string | null,
) {
  const { data, error } = await supabase
    .from('captures')
    .select('id, animal_name, scientific_name, created_at')
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
