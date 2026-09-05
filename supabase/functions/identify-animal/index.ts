import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_CLASSES: Record<string, string[]> = {
  "Mammifères": ["Mammalia"],
  "Oiseaux": ["Aves"],
  "Reptiles": ["Reptilia", "Squamata", "Testudines", "Crocodylia"],
  "Amphibiens": ["Amphibia"],
  "Poissons": ["Actinopterygii", "Chondrichthyes", "Elasmobranchii", "Sarcopterygii", "Myxini", "Petromyzonti", "Teleostei"],
  "Insectes": ["Insecta", "Collembola", "Diplopoda", "Chilopoda", "Entognatha"],
  "Arachnides": ["Arachnida"],
  "Crustacés": ["Malacostraca", "Maxillopoda", "Branchiopoda", "Hexanauplia", "Thecostraca", "Ostracoda"],
  "Mollusques": [], // fourre-tout assumé (annélides, cnidaires, échinodermes…)
};

type TaxonVerdict = {
  /** valid : espèce (ou sous-espèce) réellement publiée et cohérente.
   *  downgrade : le binôme n'existe pas mais un rang supérieur réel est identifié.
   *  invalid : rien de réel derrière le nom proposé.
   *  unknown : GBIF injoignable → on ne pénalise pas l'utilisateur. */
  status: "valid" | "downgrade" | "invalid" | "unknown";
  canonicalName?: string;
  rank?: string;
  /** Nom du rang de repli utilisable (genre, famille, ordre). */
  fallbackName?: string;
  fallbackRank?: string;
  reason?: string;
  gbif?: unknown;
};

const gbifMatch = async (params: Record<string, string>) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4_000);
  try {
    const qs = new URLSearchParams({ strict: "false", verbose: "false", ...params });
    const res = await fetch(`https://api.gbif.org/v1/species/match?${qs}`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const RANK_FR: Record<string, string> = {
  GENUS: "genre",
  FAMILY: "famille",
  ORDER: "ordre",
  CLASS: "classe",
  PHYLUM: "embranchement",
};

/**
 * Vérifie qu'un nom scientifique correspond à un taxon réellement publié
 * (référentiel mondial GBIF), que le genre et l'espèce sont cohérents entre eux,
 * et que le taxon est bien un animal compatible avec la catégorie annoncée.
 *
 * Aucun nom n'est déduit du nom vernaculaire : seul le binôme proposé est testé,
 * et à défaut on remonte au genre / famille RÉELS renvoyés par GBIF.
 */
const verifyTaxon = async (
  scientificName?: string | null,
  category?: string | null,
): Promise<TaxonVerdict> => {
  const raw = (scientificName || "").trim().replace(/\s+/g, " ");
  if (!raw) return { status: "invalid", reason: "missing_scientific_name" };

  const parts = raw.split(" ");
  const genus = parts[0];
  const isBinomial = parts.length >= 2 && /^[a-z-]+$/i.test(parts[1]);

  const data = await gbifMatch({ name: raw });
  if (!data) return { status: "unknown", reason: "gbif_unreachable" };

  const matchType = String(data.matchType || "NONE").toUpperCase();
  const rank = String(data.rank || "").toUpperCase();
  const confidence = typeof data.confidence === "number" ? data.confidence : 0;

  const checkKingdom = (d: any): string | null => {
    if (d.kingdom && d.kingdom !== "Animalia") return "not_an_animal";
    const allowed = category ? CATEGORY_CLASSES[category] : undefined;
    // Cohérence classe ↔ catégorie annoncée : un binôme réel mais rattaché à une
    // toute autre classe signale une association douteuse (nom plaqué au hasard).
    if (allowed && allowed.length > 0 && d.class && !allowed.includes(d.class)) {
      return `class_mismatch:${d.class}`;
    }
    return null;
  };

  const higherFallback = (d: any): TaxonVerdict | null => {
    const candidates: Array<[string, string | undefined]> = [
      ["GENUS", d.genus],
      ["FAMILY", d.family],
      ["ORDER", d.order],
      ["CLASS", d.class],
    ];
    for (const [r, n] of candidates) {
      if (n) return { status: "downgrade", fallbackName: n, fallbackRank: r, gbif: d };
    }
    return null;
  };

  // 1) Correspondance exploitable au rang espèce / sous-espèce.
  if (matchType !== "NONE" && (rank === "SPECIES" || rank === "SUBSPECIES" || rank === "FORM" || rank === "VARIETY")) {
    // Un FUZZY faible = le nom proposé n'existe pas, GBIF a "rapproché" autre chose.
    if (matchType === "FUZZY" && confidence < 95) {
      const fb = higherFallback(data);
      return fb ?? { status: "invalid", reason: "fuzzy_low_confidence", gbif: data };
    }
    const problem = checkKingdom(data);
    if (problem) {
      const fb = higherFallback(data);
      return fb ?? { status: "invalid", reason: problem, gbif: data };
    }
    // Cohérence genre ↔ espèce : le genre proposé doit être celui du taxon accepté.
    if (isBinomial && data.genus && data.genus.toLowerCase() !== genus.toLowerCase()) {
      const fb = higherFallback(data);
      return fb ?? { status: "invalid", reason: "genus_mismatch", gbif: data };
    }
    return {
      status: "valid",
      canonicalName: data.canonicalName || data.scientificName || raw,
      rank,
      gbif: data,
    };
  }

  // 2) GBIF ne reconnaît qu'un rang supérieur (HIGHERRANK) : le binôme est inventé.
  if (matchType !== "NONE" && rank && rank !== "SPECIES") {
    if (!isBinomial) {
      const problem = checkKingdom(data);
      if (!problem) {
        return {
          status: "valid",
          canonicalName: data.canonicalName || raw,
          rank,
          gbif: data,
        };
      }
    }
    const fb = higherFallback(data);
    return fb ?? { status: "invalid", reason: "higher_rank_only", gbif: data };
  }

  // 3) Aucune correspondance : le genre seul existe-t-il réellement ?
  if (isBinomial) {
    const g = await gbifMatch({ name: genus, rank: "genus" });
    if (!g) return { status: "unknown", reason: "gbif_unreachable" };
    const gMatch = String(g.matchType || "NONE").toUpperCase();
    if (gMatch === "EXACT" && !checkKingdom(g)) {
      return { status: "downgrade", fallbackName: g.genus || genus, fallbackRank: "GENUS", gbif: g };
    }
  }

  return { status: "invalid", reason: "no_match", gbif: data };
};



/**
 * Deux prompts, tous deux volontairement TRÈS courts : chaque jeton du prompt
 * système est refacturé à CHAQUE identification (≈ 1 600 par jour), c'est le
 * premier poste de dépense après l'image elle-même.
 *  - FAST_PROMPT : passe économique, traite la quasi-totalité des photos.
 *  - DEEP_ANNEX  : uniquement ajouté à la seconde passe (≈ 7 % des cas) avec
 *    les critères diagnostiques des confusions fréquentes.
 * Aucun des deux ne rédige la fiche descriptive (mutualisée en base).
 */
const FAST_PROMPT = `Expert naturaliste. Identifie l'animal au rang le plus précis.

1. AUTHENTICITÉ d'abord : renseigne image_type + is_real_photo. Seule une VRAIE PHOTO d'animal VIVANT est valide. Invalide : illustration, dessin, vectoriel, logo, mascotte, peinture, tatouage, statue, taxidermie, rendu 3D, image IA, jeu vidéo, capture/photo d'écran ou de papier, jouet, peluche, figurine, tout OBJET en forme d'animal (déco, déguisement, gonflable, gâteau, graffiti, panneau) ; et tout animal MORT ou préparé (plat, poisson/fruits de mer servis ou en étal, viande, carcasse, trophée, écrasé, insecte épinglé, squelette, coquille vide) → animal_mort_ou_plat. Indices : matériau/couture/socle/yeux peints, aplats sans grain, fond uni, watermark, assiette/couverts/glace/découpe/sang. Doute → is_real_photo false, "Inconnu", confidence 0, pas d'alternative.

2. INTERDITS → "Inconnu", confidence 0 : humain (humain + animal → identifie l'animal), fiction, espèces éteintes, aucun animal. Exception : vraies espèces dites "dragon" (Komodo, barbu, volant).

3. TAXONOMIE : ne déduis jamais le latin du nom français. Binôme uniquement si l'espèce est réellement publiée avec le bon genre ; sinon rang RÉEL sûr (scientific_name = ce rang seul, scientific_rank, animal_name générique, confidence ≤ 60). animal_name = nom commun français seul, sans parenthèses. Jamais de nom inventé.

4. DOMESTIQUES : race réelle seule (jamais "Croisé…"). Doute → "Chien domestique" / "Chat Européen" / "Vache domestique" + alternatives. Chien Canis lupus familiaris, chat Felis catus, bovin "Vache <Race>" Bos taurus.

5. SAUVAGE : jamais l'espèce la plus courante par défaut ; compare les critères diagnostiques et baisse la confiance si ambigu.

6. RARETÉ (France, 8 paliers) : common commune/quotidienne · uncommon peu commune/fréquente · rare plutôt rare, demande de la chance · very_rare rare/très localisée · ultra_rare menacée ou protégée · illustration_rare épique/quasi-impossible · special_rare mythique · hyper_rare légendaire, le sommet.

7. CONFIANCE : 90+ certaine · 70-89 probable · 50-69 plusieurs espèces · <50 incertain. Si < 80 → 1 à 3 alternatives.`;


/** Annexe ajoutée seulement à la passe profonde (cas ambigus). */
const DEEP_ANNEX = `

CRITÈRES DIAGNOSTIQUES (cas ambigus) :
- Cervidés : Chevreuil petit/compact, museau court noir, miroir blanc en cœur, bois ≤ 3 pointes. Cerf-Biche grand, corps allongé, encolure épaisse, museau long (grande femelle sans bois = Biche). Daim tacheté, longue queue à raie noire, bois palmés.
- Coccinelles : 22 points jaune vif 3-4 mm · Asiatique 6-8 mm pronotum blanc en M · 7 points rouge exactement 7 · 14 points damier jaune.
- Chats : face ronde Persan/British, triangulaire Siamois/Oriental, en cœur Birman ; pelage, oreilles, queue, motifs. Défaut "Chat Européen".
- Même rigueur pour mésanges, pouillots, goélands/mouettes, hirondelles/martinets, lézards, bourdons/abeilles, corvidés.
- Objet vs animal : matériau, coutures, posture rigide, socle, yeux en verre, absence de pelage individuel.`;




serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let quotaDb: ReturnType<typeof createClient> | null = null;
  let quotaUserId: string | null = null;
  let quotaRequestId: string | null = null;
  let quotaConsumed = false;

  const refundQuota = async () => {
    if (!quotaConsumed || !quotaDb || !quotaUserId || !quotaRequestId) return;
    quotaConsumed = false;
    const { error } = await quotaDb.rpc("refund_ai_analysis", {
      p_user: quotaUserId,
      p_request: quotaRequestId,
    });
    if (error) console.error("ai quota refund failed", error);
  };

  try {
    const { imageBase64, imageFast, requestId, imageHash: clientHash, probe } = await req.json();
    /** Empreinte fournie par le client (SHA-256 des octets de l'image compressée). */
    const providedHash = typeof clientHash === "string" && /^[0-9a-f]{64}$/.test(clientHash)
      ? clientHash
      : null;
    const isProbe = probe === true;

    if (!imageBase64 && !(isProbe && providedHash)) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizeDataUrl = (value: string) =>
      value.startsWith("data:") && !value.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)
        ? value.replace(/^data:[^;]*;base64,/, "data:image/jpeg;base64,")
        : value;

    // Ensure valid data URL format
    const imageUrl = imageBase64 ? normalizeDataUrl(imageBase64) : "";
    /**
     * Vignette optionnelle envoyée par le client. Mesure faite sur le gateway :
     * une image coûte un forfait fixe (~1 080 jetons) quelle que soit sa taille,
     * réduire la résolution ne fait donc PAS baisser la facture — la vignette
     * n'est gardée que pour accélérer l'upload quand le client en envoie une.
     */
    const fastImageUrl = typeof imageFast === "string" && imageFast.length > 100
      ? normalizeDataUrl(imageFast)
      : imageUrl;



    /**
     * Cache d'identification par empreinte d'image.
     * Deux envois de la même photo (retry après erreur réseau, double clic,
     * re-import depuis la galerie, réinstallation de l'app…) ne doivent jamais
     * être facturés deux fois : le résultat est mémorisé côté serveur.
     * - résultat positif : réutilisé 30 jours ;
     * - refus (photo non réelle, espèce non vérifiée, non reconnu) : réutilisé
     *   2 h seulement, pour absorber les retries sans bloquer durablement.
     */
    const cacheDb = (() => {
      try {
        return createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
      } catch (e) {
        console.error("cache client init failed", e);
        return null;
      }
    })();
    quotaDb = cacheDb;

    const sha256Hex = async (value: string) => {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    /**
     * Clé de cache : on privilégie l'empreinte calculée par le client (SHA-256
     * des octets de l'image compressée). Elle est identique pour la requête
     * « sonde » (hash seul, sans upload) et pour l'analyse réelle, ce qui permet
     * de savoir qu'une photo est déjà identifiée SANS téléverser l'image.
     */
    const imageHash = providedHash ??
      await sha256Hex((imageUrl.split(",")[1] ?? imageUrl).slice(0, 2_000_000));
    /** Un verdict « ce n'est pas une vraie photo » est déterministe : on le garde longtemps. */
    const NEGATIVE_TTL_MS = 2 * 60 * 60 * 1000;
    const LONG_LIVED_OUTCOMES = ["success", "not_a_real_photo"];

    const jsonResponse = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    /** Réponse finale mise en cache (et mesurée). */
    const finish = async (body: Record<string, unknown>, outcome: string) => {
      if (cacheDb) {
        try {
          await cacheDb.from("identify_cache").upsert({
            image_hash: imageHash,
            outcome,
            payload: { ...body, __outcome: outcome, __at: Date.now() },
            created_at: new Date().toISOString(),
            hits: 0,
          }, { onConflict: "image_hash" });
        } catch (e) {
          console.error("identify cache write failed", e);
        }
      }
      return jsonResponse(body);
    };

    if (cacheDb) {
      try {
        const { data: cached } = await cacheDb.rpc("claim_identify_cache", {
          p_hash: imageHash,
          p_max_age: "30 days",
        });
        if (cached && typeof cached === "object") {
          const outcome = String((cached as any).__outcome ?? "success");
          const at = Number((cached as any).__at ?? 0);
          const fresh = LONG_LIVED_OUTCOMES.includes(outcome) ||
            Date.now() - at < NEGATIVE_TTL_MS;
          if (fresh) {
            const body = { ...(cached as Record<string, unknown>) };
            delete body.__outcome;
            delete body.__at;
            console.log("identify cache hit", outcome, isProbe ? "(probe)" : "");
            // Mesure : une réutilisation de cache = un appel IA économisé.
            cacheDb.from("ml_dataset_events").insert({
              event_type: "identify_cache_hit",
              source: "server",
              image_hash: imageHash,
              is_ground_truth: false,
              payload: { outcome, probe: isProbe },
            }).then(({ error }: { error: unknown }) => {
              if (error) console.error("cache hit log failed", error);
            });
            return jsonResponse({ ...body, cached: true });
          }
        }
      } catch (e) {
        console.error("identify cache read failed", e);
      }
    }

    // Sonde : aucune analyse n'est déclenchée, aucun quota consommé. Le client
    // enchaîne avec l'analyse complète seulement si le cache est vide.
    if (isProbe) {
      return jsonResponse({ success: false, reason: "cache_miss" });
    }



    /**
     * Quota d'analyses IA aligné sur le quota de captures : 4 analyses
     * réellement facturées par jour en gratuit, illimité en Premium.
     * Les réutilisations de cache ne consomment rien : le contrôle est
     * volontairement placé après le cache.
     */
    if (cacheDb) {
      try {
        const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const { data: userData } = await cacheDb.auth.getUser(token);
        const userId = userData?.user?.id;
        if (userId) {
          const stableRequestId = typeof requestId === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
            ? requestId
            : crypto.randomUUID();
          quotaUserId = userId;
          quotaRequestId = stableRequestId;
          const { data: remaining, error: quotaError } = await cacheDb.rpc("consume_ai_analysis", {
            p_user: userId,
            p_request: stableRequestId,
          });
          if (quotaError) {
            // Le quota ne doit jamais bloquer le service en cas d'incident base.
            console.error("ai quota check failed", quotaError);
          } else if (typeof remaining === "number" && remaining < 0) {
            const premiumCap = remaining === -2;
            console.log("ai quota exhausted", userId, premiumCap ? "premium" : "free");
            // Statut 200 volontaire : le client doit pouvoir afficher le
            // message tel quel (invoke() masque le corps des réponses 4xx).
            return jsonResponse({
              success: false,
              reason: "daily_limit",
              message: premiumCap
                ? "Tu as atteint le plafond de sécurité de 200 analyses sur les dernières 24 h (protection anti-abus de ton abonnement Premium). Réessaie un peu plus tard."
                : "Tu as atteint ta limite de 4 analyses pour aujourd'hui. Reviens demain, ou passe en Faunex Premium pour des analyses illimitées.",
            });

          } else {
            quotaConsumed = true;
          }
        }
      } catch (e) {
        console.error("ai quota skipped", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Effet « première impression » : pour les 4 premières captures d'un
    // compte, on saute la passe économique et on analyse directement avec le
    // modèle performant sur l'image pleine résolution. L'utilisateur ne voit
    // rien — il constate juste que l'app reconnaît bien ses animaux.
    let isNewUser = false;
    if (cacheDb && quotaUserId) {
      try {
        const { count } = await cacheDb
          .from("captures")
          .select("id", { count: "exact", head: true })
          .eq("user_id", quotaUserId);
        isNewUser = typeof count === "number" && count < 4;
        if (isNewUser) console.log("new user boost", quotaUserId, count);
      } catch (e) {
        console.error("new user check failed", e);
      }
    }

    // Montée d'un cran en qualité sans partir sur du Pro : génération 3.x.
    // Flash Lite 3.1 en première passe (coût proche de l'ancien 2.5 Lite mais
    // sensiblement meilleur en vision), Flash 3.5 en seconde passe quand le
    // premier modèle échoue ou hésite. Jamais de modèle Pro.
    const FAST_MODEL = isNewUser ? "google/gemini-3.5-flash" : "google/gemini-3.1-flash-lite";
    const DEEP_MODEL = "google/gemini-3.5-flash";

    const callGateway = async (
      model: string,
      timeoutMs: number,
      prompt: string,
      effort: "low" | "high" = "low",
      image: string = fastImageUrl,
    ) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          signal: controller.signal,

      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        // Les modèles Gemini 3 « réfléchissent » par défaut : ces jetons de
        // raisonnement sont facturés en sortie et représentent une part
        // importante de la note. La passe rapide n'en a pas besoin (vision +
        // schéma imposé) ; la passe profonde, elle, garde un budget élevé
        // pour trancher les confusions difficiles.
        reasoning_effort: effort,
        // Réponse bornée : le schéma est court, un plafond évite les sorties
        // (et les jetons de raisonnement) qui partent en dérive.
        max_tokens: effort === "high" ? 1200 : 600,
        messages: [
          { role: "system", content: prompt },

          {
            role: "user",
            content: [
              {
                type: "text",
                // Les critères détaillés sont déjà dans le prompt système :
                // on ne les répète ni ici ni dans les descriptions du schéma
                // (chaque répétition est facturée à chaque appel).
                text: "1) image_type + is_real_photo. 2) Si vraie photo : identifie au rang le plus précis, calibre la confiance, alternatives si doute."
              },

              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],

        tools: [
          {
            type: "function",
            function: {
              name: "identify_animal",
              description: "Identification d'un animal sur photo",
              parameters: {
                type: "object",
                properties: {
                  is_real_photo: { type: "boolean" },
                  image_type: {
                    type: "string",
                    enum: ["photo_reelle", "illustration", "dessin", "logo_icone", "peinture", "rendu_3d", "image_generee_ia", "capture_ecran", "photo_ecran_ou_papier", "jouet_peluche_figurine", "objet_representation", "animal_mort_ou_plat", "autre"]
                  },
                  animal_name: { type: "string" },
                  scientific_name: { type: "string" },
                  scientific_rank: {
                    type: "string",
                    enum: ["subspecies", "species", "genus", "family", "order", "class"]
                  },

                  category: {
                    type: "string",
                    enum: ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Arachnides", "Crustacés", "Mollusques"],
                    description: "Myriapodes → Insectes ; vers, échinodermes et cnidaires → Mollusques."
                  },

                  // La fiche (description, habitat, régime, conservation,
                  // anecdote) n'est plus demandée ici : elle est mutualisée en
                  // base par espèce (species_profiles) et générée au maximum
                  // une seule fois, ce qui supprime des centaines de jetons de
                  // sortie sur chaque identification.

                  rarity: {
                    type: "string",
                    enum: ["common", "uncommon", "rare", "very_rare", "ultra_rare", "illustration_rare", "special_rare", "hyper_rare"]
                  },
                  confidence: { type: "integer", minimum: 0, maximum: 100 },
                  alternatives: {
                    type: "array",
                    items: { type: "string" }
                  },
                  subject_bbox: {
                    type: "object",
                    description: "Boîte du sujet, normalisée 0..1 (x,y coin haut-gauche, w,h taille), généreuse. Omets si aucun animal.",

                    properties: {
                      x: { type: "number", minimum: 0, maximum: 1 },
                      y: { type: "number", minimum: 0, maximum: 1 },
                      w: { type: "number", minimum: 0, maximum: 1 },
                      h: { type: "number", minimum: 0, maximum: 1 }
                    },
                    required: ["x", "y", "w", "h"],
                    additionalProperties: false
                  }
                },
                required: ["is_real_photo", "image_type", "animal_name", "scientific_name", "category", "rarity", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],

        tool_choice: { type: "function", function: { name: "identify_animal" } },
      }),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    /**
     * L'upstream Flash Lite se bloque parfois (~90 s sans le moindre octet) :
     * c'est la cause des "il faut scanner deux fois". On borne donc chaque appel
     * à un délai court et on relance immédiatement une requête neuve, qui
     * répond en général en 2 s. Budget total borné (< 50 s) pour rester sous le
     * timeout client.
     */
    const tryModel = async (
      model: string,
      // Un timeout par tentative : le premier essai doit être assez long
      // pour laisser le modèle finir (sinon on abandonne un appel déjà
      // facturé et on en relance un second pour rien).
      timeouts: number[],
      prompt: string,
      effort: "low" | "high" = "low",
      image: string = fastImageUrl,
    ) => {
      const attempts = timeouts.length;
      for (let i = 0; i < attempts; i++) {
        const startedAt = Date.now();
        try {
          let r = await callGateway(model, timeouts[i], prompt, effort, image);
          if (!r.ok && r.status >= 500 && i < attempts - 1) continue;
          return r;
        } catch (netErr) {
          console.error(
            "AI gateway stalled/failed",
            model,
            `attempt ${i + 1}/${attempts}`,
            `${Date.now() - startedAt}ms`,
            netErr,
          );
          if (i === attempts - 1) return null;
        }
      }
      return null;
    };



    // Réponse brute du modèle conservée pour tracer les hallucinations.
    let rawModelOutput: string | null = null;
    let usedModel: string | null = null;
    /** Consommation réelle (entrée / sortie / raisonnement) cumulée sur la requête. */
    const tokenUsage: Record<string, number> = {};

    const addUsage = (model: string, usage: any) => {
      if (!usage || typeof usage !== "object") return;
      const prompt = Number(usage.prompt_tokens ?? 0) || 0;
      const completion = Number(usage.completion_tokens ?? 0) || 0;
      const reasoning = Number(
        usage.completion_tokens_details?.reasoning_tokens ??
          usage.reasoning_tokens ?? 0,
      ) || 0;
      const cached = Number(usage.prompt_tokens_details?.cached_tokens ?? 0) || 0;
      tokenUsage.prompt = (tokenUsage.prompt ?? 0) + prompt;
      tokenUsage.completion = (tokenUsage.completion ?? 0) + completion;
      tokenUsage.reasoning = (tokenUsage.reasoning ?? 0) + reasoning;
      tokenUsage.cached = (tokenUsage.cached ?? 0) + cached;
      tokenUsage.calls = (tokenUsage.calls ?? 0) + 1;
      console.log(
        `token usage ${model} prompt=${prompt} cached=${cached} out=${completion} thinking=${reasoning}`,
      );
    };


    // Le nom commun doit rester lisible : « nom de l'animal » sans mention entre
    // parenthèses (famille, genre, sexe, nom scientifique répété…).
    // Nettoyage : parenthèses, et surtout les marques d'incertitude ("?", "cf.",
    // "sp?") que le modèle glisse parfois dans le libellé et qui finissent
    // affichées telles quelles dans le bestiaire.
    const cleanCommonName = (value: unknown) => {
      const s = String(value ?? "");
      const stripped = s
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/[?¿]+/g, " ")
        .replace(/\b(cf|aff)\.\s*/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
        .trim();
      return stripped || s.replace(/[?¿]+/g, " ").trim();
    };

    const cleanScientificName = (value: unknown) => {
      const s = String(value ?? "");
      return s
        .replace(/[?¿]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    };


    const parseAnimal = async (r: Response, model: string) => {
      const d = await r.json();
      addUsage(model, d.usage);
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return null;
      rawModelOutput = typeof tc.function?.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function?.arguments ?? null);
      usedModel = model;
      try {
        const parsed = JSON.parse(tc.function.arguments);
        if (parsed && typeof parsed === "object") {
          if (parsed.animal_name) parsed.animal_name = cleanCommonName(parsed.animal_name);
          if (parsed.scientific_name) parsed.scientific_name = cleanScientificName(parsed.scientific_name);

          if (Array.isArray(parsed.alternatives)) {
            parsed.alternatives = parsed.alternatives.map((a: unknown) => cleanCommonName(a)).filter(Boolean);
          }
        }
        return parsed;
      } catch {
        return null;
      }
    };



    // 1) Passe économique (Flash Lite) sur la vignette basse résolution :
    //    elle couvre la très grande majorité des animaux pour ~3× moins de
    //    jetons d'image.
    let response = await tryModel(
      FAST_MODEL,
      // UN seul appel : une relance « au cas où » sur le même modèle est un
      // second appel facturé pour rien. Si celui-ci échoue ou hésite, c'est la
      // passe profonde (meilleure) qui prend le relais.
      [26_000],

      isNewUser ? FAST_PROMPT + DEEP_ANNEX : FAST_PROMPT,
      isNewUser ? "high" : "low",
      isNewUser ? imageUrl : undefined,
    );
    let animalData = response?.ok ? await parseAnimal(response, FAST_MODEL) : null;


    // 2) Second passage sur Flash (bon marché, jamais de Pro) avec l'annexe
    // diagnostique ET la photo pleine résolution, uniquement quand Lite échoue
    // ou hésite franchement. Effort de raisonnement modéré : au-delà, les
    // jetons de « réflexion » coûtent plus que le gain de précision observé.
    const CONFUSABLE = /(chevreuil|biche|cerf|daim|faon|coccinelle|mesange|mésange|pouillot|goeland|goéland|mouette|hirondelle|martinet|bourdon|abeille|corneille|corbeau|choucas|lezard|lézard|pipistrelle)/i;
    const label = String(animalData?.animal_name || "");
    const confidence = typeof animalData?.confidence === "number" ? animalData.confidence : -1;
    const needsDeep =
      !animalData ||
      confidence < 55 ||
      (CONFUSABLE.test(label) && confidence < 70);

    if (needsDeep) {
      // L'upstream se bloque parfois : sans résultat de la passe rapide, un
      // abandon ici renvoie une erreur technique à l'utilisateur. On s'autorise
      // donc UNE relance (requête neuve, qui répond en général en 2 s) dans ce
      // seul cas — quand la passe rapide a déjà un résultat, on garde un unique
      // appel pour ne pas payer deux fois. Budget max : 26 s + 20 s + 12 s.
      const deep = await tryModel(
        DEEP_MODEL,
        animalData ? [20_000] : [20_000, 12_000],
        FAST_PROMPT + DEEP_ANNEX,
        "low",
        imageUrl,
      );
      if (deep?.ok) {
        const deepData = await parseAnimal(deep, DEEP_MODEL);
        if (deepData) {
          animalData = deepData;
          response = deep;
        }
      } else if (deep) {
        response = response?.ok ? response : deep;
      }
    }


    // 3) Contrôle d'authenticité : une illustration, un logo, un dessin ou une
    // capture d'écran représentant un animal n'est jamais une capture valide.
    // Le verdict retenu est celui du dernier modèle exécuté (le modèle profond
    // repasse systématiquement sur les cas à confiance faible, dont ceux-ci).
    const imageType = typeof animalData?.image_type === "string" ? animalData.image_type : null;
    const notRealPhoto =
      animalData?.is_real_photo === false || (imageType !== null && imageType !== "photo_reelle");

    if (animalData && notRealPhoto) {
      console.log("rejected non-photographic image", imageType);
      return await finish(
        { success: false, reason: "not_a_real_photo", image_type: imageType },
        "not_a_real_photo",
      );
    }


    if (!animalData) {
      if (response && !response.ok) {
        if (response.status === 429) {
          await refundQuota();
          return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          await refundQuota();
          return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", response.status, await response.text().catch(() => ""));
        await refundQuota();
        return new Response(JSON.stringify({ error: "Erreur d'identification" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!response) {
        await refundQuota();
        return new Response(JSON.stringify({ error: "Analyse interrompue (réseau)" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Vraie non-reconnaissance : on répond 200 pour que le client bascule
      // sur la saisie manuelle (et non sur l'écran d'erreur technique).
      await refundQuota();
      return await finish({ success: false, reason: "not_identified" }, "not_identified");
    }


    const admin = (() => {
      try {
        return createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
      } catch (e) {
        console.error("admin client init failed", e);
        return null;
      }
    })();

    /** Trace « best effort » de la réponse brute du modèle + verdict taxonomique. */
    const logRaw = async (verdict: TaxonVerdict | null, outcome: string) => {
      if (!admin) return;
      try {
        await admin.from("ml_dataset_events").insert({
          event_type: "ai_prediction",
          source: "server",
          model: usedModel,
          predicted_name: animalData?.animal_name ?? null,
          predicted_scientific_name: animalData?.scientific_name ?? null,
          predicted_category: animalData?.category ?? null,
          predicted_rarity: animalData?.rarity ?? null,
          confidence: typeof animalData?.confidence === "number" ? animalData.confidence : null,
          subject_bbox: animalData?.subject_bbox ?? null,
          is_ground_truth: false,
          payload: {
            raw_model_output: rawModelOutput,
            taxon_verdict: verdict,
            token_usage: tokenUsage,
            outcome,
          },
        });
      } catch (e) {
        console.error("raw identification log failed", e);
      }
    };

    // Déduplication : si l'espèce existe déjà dans le bestiaire (nom commun OU nom
    // scientifique, insensible casse/accents/tirets), on réutilise la fiche canonique
    // pour éviter les doublons type "Graphosome rayé" / "Graphosome d'Italie".
    let knownInBestiary = false;
    if (admin && animalData?.animal_name && animalData.animal_name.toLowerCase() !== "inconnu") {
      try {
        /* Un timeout Postgres (57014) pendant un recalcul de rareté ne doit pas
         * faire sauter silencieusement la déduplication : on retente avec un
         * court backoff avant d'abandonner. */
        let matches: any = null;
        let matchErr: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await admin.rpc("match_animal", {
            p_name: animalData.animal_name,
            p_scientific: animalData.scientific_name || null,
          });
          matches = res.data;
          matchErr = res.error;
          if (!matchErr) break;
          console.error("match_animal failed", attempt, matchErr);
          if (matchErr.code !== "57014" && !String(matchErr.message ?? "").includes("timeout")) break;
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        }
        const existing = Array.isArray(matches) ? matches[0] : matches;

        if (existing) {
          knownInBestiary = true;
          animalData.animal_name = existing.name || animalData.animal_name;
          animalData.scientific_name = existing.scientific_name || animalData.scientific_name;
          animalData.category = existing.category || animalData.category;
          animalData.rarity = existing.rarity || animalData.rarity;
        }
      } catch (e) {
        console.error("dedup lookup failed", e);
      }
    }

    /**
     * Garde-fou anti-hallucination.
     * Une espèce absente du bestiaire canonique doit être validée taxonomiquement
     * (GBIF) : binôme réellement publié, genre cohérent avec l'espèce, taxon animal
     * compatible avec la catégorie annoncée. Sinon, aucune fiche n'est créée et
     * l'utilisateur bascule sur la saisie manuelle / modération, avec un repli
     * honnête au rang supérieur réel (genre / famille / ordre).
     */
    if (
      !knownInBestiary &&
      animalData?.animal_name &&
      animalData.animal_name.toLowerCase() !== "inconnu"
    ) {
      const verdict = await verifyTaxon(animalData.scientific_name, animalData.category);

      if (verdict.status === "invalid" || verdict.status === "downgrade") {
        console.warn(
          "taxon rejected",
          animalData.scientific_name,
          verdict.status,
          verdict.reason ?? verdict.fallbackRank,
        );
        await logRaw(verdict, `rejected_${verdict.status}`);

        const rankFr = verdict.fallbackRank ? RANK_FR[verdict.fallbackRank] : null;
        const hint = verdict.fallbackName
          ? `Identification probable : ${rankFr ?? "rang"} ${verdict.fallbackName}. L'espèce ne peut pas être confirmée avec suffisamment de fiabilité.`
          : "L'espèce proposée n'a pas pu être confirmée dans les référentiels taxonomiques. Décris l'animal pour vérification.";

        // Espèce non confirmée = échec d'identification côté outil, pas une
        // triche : l'explorateur ne doit pas perdre une de ses 4 analyses.
        await refundQuota();

        return await finish(
          {
            success: false,
            reason: "unverified_species",
            hint,
            suggestion: verdict.fallbackName
              ? { scientific_name: verdict.fallbackName, rank: verdict.fallbackRank }
              : null,
          },
          "unverified_species",
        );
      }

      if (verdict.status === "valid") {
        // On aligne le nom latin sur le nom accepté par GBIF (orthographe, synonymie).
        if (verdict.canonicalName) animalData.scientific_name = verdict.canonicalName;
        animalData.scientific_rank = (verdict.rank || animalData.scientific_rank || "").toString().toLowerCase();
        animalData.taxon_validated = true;
        // Une confiance élevée n'est jamais affichée si l'espèce n'est pas atteinte.
        const isSpecies = ["species", "subspecies", "form", "variety"].includes(animalData.scientific_rank);
        if (!isSpecies && typeof animalData.confidence === "number") {
          animalData.confidence = Math.min(animalData.confidence, 60);
        }
      } else {
        // GBIF injoignable : on n'empêche pas la capture mais on ne prétend pas
        // à une identification validée, et la confiance affichée est plafonnée.
        animalData.taxon_validated = false;
        if (typeof animalData.confidence === "number") {
          animalData.confidence = Math.min(animalData.confidence, 70);
        }
      }

      await logRaw(verdict, `accepted_${verdict.status}`);
    } else {
      animalData.taxon_validated = knownInBestiary;
      await logRaw(null, knownInBestiary ? "accepted_known_bestiary" : "accepted_unknown_label");
    }

    /**
     * Fiche descriptive : mutualisée par espèce.
     * 1) On cherche la fiche déjà rédigée en base (cas très majoritaire : le
     *    bestiaire contient déjà des milliers d'espèces) → coût IA nul.
     * 2) Sinon on la génère UNE seule fois, par un appel texte (sans image,
     *    donc très bon marché) et on la met en cache pour tous les explorateurs
     *    suivants.
     */
    const attachProfile = async () => {
      const name = String(animalData?.animal_name || "").trim();
      if (!admin || !name || name.toLowerCase() === "inconnu") return;

      try {
        const { data } = await admin.rpc("species_profile_for", {
          p_name: name,
          p_scientific: animalData.scientific_name || null,
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.description) {
          animalData.description = row.description;
          animalData.habitat = row.habitat;
          animalData.diet = row.diet;
          animalData.conservation = row.conservation;
          animalData.fun_fact = row.fun_fact;
          animalData.profile_source = "cache";
          return;
        }
      } catch (e) {
        console.error("species profile lookup failed", e);
      }

      // Génération unique (texte seul, pas d'image → coût minimal).
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: FAST_MODEL,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content:
                  "Naturaliste francophone. Rédige une fiche d'encyclopédie GÉNÉRIQUE de l'espèce demandée : elle sera lue par tous les explorateurs, indépendamment de toute photo. Interdiction absolue de décrire une image ou un individu précis : jamais \"sur la photo\", \"on voit\", \"l'image\", \"ce spécimen\", \"ici\", \"au premier plan\", \"photographié\", ni de posture, décor ou arrière-plan. Décris l'espèce en général (morphologie typique, dimorphisme, comportement) au présent, de façon factuelle et vérifiée, sans invention. Réponds uniquement via l'appel de fonction species_profile.",

              },
              {
                role: "user",
                content: `Espèce : ${name}${animalData.scientific_name ? ` (${animalData.scientific_name})` : ""}. Catégorie : ${animalData.category || "inconnue"}.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "species_profile",
                  description: "Fiche d'espèce",
                  parameters: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "2-3 phrases GÉNÉRIQUES sur l'espèce (physique distinctif typique, comportement). Aucune référence à une photo ou à un individu observé." },
                      habitat: { type: "string", description: "Habitat et répartition." },
                      diet: { type: "string", description: "Régime alimentaire." },
                      conservation: { type: "string", description: "Statut UICN : LC, NT, VU, EN, CR ou 'Domestique'." },
                      fun_fact: { type: "string", description: "Fait surprenant et vérifié." },
                    },
                    required: ["description", "habitat", "diet", "conservation", "fun_fact"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "species_profile" } },
          }),
        });
        if (!r.ok) {
          console.error("species profile generation failed", r.status);
          return;
        }
        const d = await r.json();
        const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        const profile = args ? JSON.parse(args) : null;
        if (!profile?.description) return;

        animalData.description = profile.description;
        animalData.habitat = profile.habitat;
        animalData.diet = profile.diet;
        animalData.conservation = profile.conservation;
        animalData.fun_fact = profile.fun_fact;
        animalData.profile_source = "generated";

        // Mise en cache pour toutes les identifications suivantes de l'espèce.
        await admin.rpc("upsert_species_profile", {
          p_name: name,
          p_scientific: animalData.scientific_name || null,
          p_description: profile.description,
          p_habitat: profile.habitat,
          p_diet: profile.diet,
          p_conservation: profile.conservation,
          p_fun_fact: profile.fun_fact,
        });
      } catch (e) {
        console.error("species profile generation error", e);
      }
    };

    await attachProfile();


    return await finish({ success: true, animal: animalData }, "success");


  } catch (e) {
    console.error("identify-animal error:", e);
    await refundQuota();
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
