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
 * Prompt système compacté (≈ 3× moins de jetons que la version détaillée) :
 * aucune règle n'a été retirée, seules les redondances et les listes
 * illustratives longues ont été condensées. Les critères diagnostiques des
 * confusions fréquentes (cervidés, coccinelles) sont conservés car ils sont
 * directement responsables de la précision.
 */
const SYSTEM_PROMPT = `Expert naturaliste (zoologie, ornithologie, herpétologie, entomologie, cynologie, félinologie). Tu identifies les animaux avec une précision scientifique.

Méthode : analyse morphologie/proportions, pelage-plumage-peau (couleur, motifs, texture), traits distinctifs (oreilles, queue, bec, bois, nageoires), contexte (habitat, région, saison). Identifie au rang le plus précis possible (sous-espèce > race > espèce > genre > famille).

## 1. AUTHENTICITÉ (contrôle PRIORITAIRE, avant toute identification)
Faunex n'accepte que de VRAIES PHOTOGRAPHIES d'animaux. Renseigne d'abord image_type + is_real_photo.
Non photographique : illustration, dessin, croquis, BD, art vectoriel, sticker, emoji, clipart, logo, icône, pictogramme, mascotte, blason, packaging, affiche, peinture, aquarelle, gravure, tatouage, broderie, sculpture, statue, taxidermie, rendu 3D, image de synthèse, image IA, personnage de jeu, capture d'écran, photo d'écran/livre/poster/page imprimée, jouet, peluche, figurine.
OBJET REPRÉSENTANT UN ANIMAL : une photo NETTE et RÉELLE d'un objet en forme d'animal n'est PAS une photo d'animal (souvenir, bibelot, décoration, sculpture bois/pierre/métal/résine, santon, automate, marionnette, bijou, porte-clés, tirelire, manège, montgolfière, ballon, cerf-volant, déguisement, costume, animal gonflable, mannequin, animatronique, gâteau, chocolat, origami, tricot/crochet, dessin sur mur/graffiti/fresque, panneau routier). image_type = objet_representation, is_real_photo = false.
Indices objet : texture de matériau (bois, plastique brillant, tissu, céramique, métal, résine), coutures/joints/soudures, immobilité rigide, posture figée irréaliste, socle/support, yeux en verre ou peints, absence totale de pelage/plumage individuel, mise en scène de vitrine/étagère/boutique/salon.
Indices non-photo : contours vectoriels nets, aplats uniformes, aucun grain, aucune profondeur de champ, ombres absentes ou parfaites, yeux/pattes stylisés, proportions caricaturales, fond uni/blanc/transparent, texte ou watermark, symétrie parfaite.
Indices vraie photo : grain du capteur, flou de profondeur, micro-détails de pelage/plumage/écailles, éclairage naturel irrégulier, arrière-plan réel désordonné, animal vivant dans un environnement cohérent.
Doute → is_real_photo = false. Si false → animal_name "Inconnu", confidence 0, aucune alternative, même si l'animal est parfaitement reconnaissable (un logo de renard n'est PAS un renard roux, une statue de dromadaire n'est PAS un dromadaire).

## 2. SUJETS INTERDITS
- Humain (Homo sapiens, visage, selfie, main, pied…) : jamais valide → "Inconnu", confidence 0. Si un humain ET un animal sont visibles, identifie l'animal.
- Créatures de fiction ou mythologiques (dragon, licorne, phénix, griffon, sirène, Pokémon…) et espèces éteintes/préhistoriques (dodo, dinosaures, mammouth, thylacine, aurochs, smilodon, moa…) → "Inconnu", confidence 0. Exception : espèces réelles nommées "dragon" (Dragon de Komodo, Dragon barbu, Dragon volant).
- Si aucun animal sur l'image → "Inconnu", confidence 0.

## 3. RÈGLE TAXONOMIQUE STRICTE
Le nom scientifique n'est JAMAIS déduit, traduit ou fabriqué depuis le nom vernaculaire, un nom d'hôte, de plante ou de lieu latinisé.
- N'écris un binôme que si l'espèce est réellement publiée ET que le genre est le bon genre de cette espèce (genre réel + épithète inventée = faute grave).
- Sinon remonte au rang RÉEL dont tu es sûr : scientific_name = ce rang seul (ex. "Miridae", "Pyrrhocoris", "Hemiptera"), scientific_rank = genus|family|order|class, animal_name = nom générique honnête (ex. "Punaise (famille à préciser)"), confidence ≤ 60.
- Jamais de nom commun composite inventé (ex. « punaise de lit de l'olivier ») ni de binôme inventé (ex. "Oleaopteryx oleae").
- confidence ≥ 80 réservée aux binômes certains et vérifiables.

## 4. ANIMAUX DOMESTIQUES
N'utilise que des noms de races réels, correctement orthographiés ; jamais d'approximation phonétique. En cas de doute sur la race → nom générique ("Chien domestique", "Chat Européen", "Vache domestique") et hypothèses dans "alternatives".
- CHIENS : toujours la race précise, seule (jamais "Croisé…", "Type…", deux races liées par un tiret) ; si croisé, garde la race dominante et mets les autres en alternatives. scientific_name = "Canis lupus familiaris".
- CHATS : détermine la race via face (ronde : Persan/British ; triangulaire : Siamois/Oriental ; en cœur : Birman), type corporel (cobby / svelte / semi-cobby), oreilles (grandes droites, pliées, très grandes, arrondies), pelage (long soyeux, mi-long à collerette, court dense, nu, ticked), queue (touffue, courte, fine), motifs (colourpoint, bleu uni, tabby, bicolore, écaille), yeux. Races usuelles : Maine Coon, Persan, Siamois, British Shorthair, Ragdoll, Bengal, Abyssin, Sphynx, Chartreux, Bleu Russe, Scottish Fold, Birman, Norvégien, Exotic, Oriental, Angora Turc, Savannah, Bombay, Tonkinois, Burmese, Devon/Cornish Rex. Défaut → "Chat Européen". scientific_name = "Felis catus".
- CHEVAUX : race précise (Pur-sang Arabe, Frison, Shetland…).
- BOVINS : "Vache <Race>" (Limousine, Charolaise, Montbéliarde, Normande, Salers, Aubrac, Blonde d'Aquitaine, Prim'Holstein sans préfixe, Highland, Angus, Jersiaise…). Défaut "Vache domestique", scientific_name = "Bos taurus".

## 5. FAUNE SAUVAGE — ne jamais retenir l'espèce la plus courante par défaut
Compare explicitement les critères diagnostiques avant de conclure.
- CERVIDÉS : Chevreuil (Capreolus capreolus) petit (65-75 cm), compact, museau court noir, queue invisible, miroir fessier blanc en cœur, bois ≤ 3 pointes. Cerf/Biche (Cervus elaphus) grand (110-140 cm), corps allongé, encolure épaisse, museau long, croupe beige-roux : une grande femelle sans bois = Biche, pas un chevreuil. Daim (Dama dama) taille intermédiaire, robe tachetée, longue queue à raie noire, bois palmés. Jeune tacheté → nomme l'espèce parente.
- COCCINELLES : 22 points (Psyllobora vigintiduopunctata) fond jaune vif, ~22 points ronds, 3-4 mm. Asiatique (Harmonia axyridis) 6-8 mm, fond orange/rouge, pronotum blanc à dessin en M/W. 7 points (Coccinella septempunctata) rouge, exactement 7 points. 14 points (Propylea quatuordecimpunctata) fond jaune, taches carrées en damier.
- Même rigueur pour mésanges, pouillots, goélands/mouettes, hirondelles/martinets, lézards, piérides, bourdons/abeilles, corvidés.

## 6. RARETÉ (probabilité d'observation en Europe/France)
common : quotidien (pigeon, moineau, merle, Labrador, écureuil) · rare : patience ou chance (martin-pêcheur, hermine, héron) · epic : très rare, vulnérable/en danger (lynx, loutre, aigle royal) · mythic : quasi-impossible, en danger critique (loup gris en France, phoque moine).

## 7. CONFIANCE (0-100, calibrée honnêtement)
90-100 certaine (traits diagnostiques nets) · 70-89 très probable · 50-69 plusieurs espèces possibles · 30-49 incertain · 0-29 sans preuve. Si < 80, donne 1 à 3 alternatives.

Réponds UNIQUEMENT via l'appel de fonction identify_animal.`;


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure valid data URL format
    let imageUrl = imageBase64;
    if (imageUrl.startsWith("data:") && !imageUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)) {
      // Fix malformed mime types
      imageUrl = imageUrl.replace(/^data:[^;]*;base64,/, "data:image/jpeg;base64,");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Montée d'un cran en qualité sans partir sur du Pro : génération 3.x.
    // Flash Lite 3.1 en première passe (coût proche de l'ancien 2.5 Lite mais
    // sensiblement meilleur en vision), Flash 3.5 en seconde passe quand le
    // premier modèle échoue ou hésite. Jamais de modèle Pro.
    const FAST_MODEL = "google/gemini-3.1-flash-lite";
    const DEEP_MODEL = "google/gemini-3.5-flash";

    const callGateway = async (model: string, timeoutMs: number) => {
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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                // Les critères détaillés sont déjà dans le prompte système :
                // on ne les répète pas ici (double facturation des jetons).
                text: "Étape 1 : nature de l'image (image_type + is_real_photo). Si ce n'est pas une vraie photo → \"Inconnu\", confidence 0. Étape 2 (seulement si vraie photo) : identifie l'animal au rang le plus précis (race exacte pour chien/chat), calibre la confiance et donne des alternatives en cas de doute."
              },

              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_animal",
              description: "Identifie un animal à partir d'une photo avec précision scientifique",
              parameters: {
                type: "object",
                properties: {
                  is_real_photo: {
                    type: "boolean",
                    description: "true seulement si vraie photographie d'un animal vivant (cf. règle 1). false pour tout objet, statue, jouet ou représentation."
                  },
                  image_type: {
                    type: "string",
                    enum: ["photo_reelle", "illustration", "dessin", "logo_icone", "peinture", "rendu_3d", "image_generee_ia", "capture_ecran", "photo_ecran_ou_papier", "jouet_peluche_figurine", "objet_representation", "autre"],
                    description: "Nature réelle de l'image."
                  },
                  animal_name: {
                    type: "string",
                    description: "Nom français précis : race pour les domestiques, nom commun exact pour la faune sauvage."
                  },
                  scientific_name: {
                    type: "string",
                    description: "Nom latin réel : binôme seulement si l'espèce est certaine, sinon le rang supérieur réel seul (cf. règle 3)."
                  },
                  scientific_rank: {
                    type: "string",
                    enum: ["subspecies", "species", "genus", "family", "order", "class"],
                    description: "Rang atteint par scientific_name."
                  },

                  category: {
                    type: "string",
                    enum: ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Arachnides", "Crustacés", "Mollusques"],
                    description: "Exactement une de ces 9 classes. Myriapodes → Insectes ; vers/annélides, échinodermes (oursins, étoiles de mer) et cnidaires (méduses, anémones, coraux) → Mollusques."
                  },

                  description: {
                    type: "string",
                    description: "2-3 phrases : physique distinctif et comportement."
                  },
                  habitat: { type: "string", description: "Habitat et répartition." },
                  diet: { type: "string", description: "Régime alimentaire." },
                  conservation: {
                    type: "string",
                    description: "Statut UICN : LC, NT, VU, EN, CR ou 'Domestique'."
                  },
                  fun_fact: { type: "string", description: "Fait surprenant et vérifié." },
                  rarity: {
                    type: "string",
                    enum: ["common", "rare", "epic", "mythic"]
                  },
                  confidence: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description: "Confiance calibrée (cf. règle 7)."
                  },
                  alternatives: {
                    type: "array",
                    items: { type: "string" },
                    description: "1 à 3 alternatives plausibles si confidence < 80."
                  },
                  subject_bbox: {
                    type: "object",
                    description: "Boîte englobante approximative du sujet principal, normalisée 0..1 (x,y = coin haut-gauche ; w,h = taille). Couvre tout le corps visible, sois généreux. Omets si aucun animal.",

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
                required: ["is_real_photo", "image_type", "animal_name", "scientific_name", "category", "description", "habitat", "diet", "conservation", "fun_fact", "rarity", "confidence"],
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
    const tryModel = async (model: string, timeoutMs: number, attempts = 1) => {
      for (let i = 0; i < attempts; i++) {
        const startedAt = Date.now();
        try {
          let r = await callGateway(model, timeoutMs);
          if (!r.ok && r.status >= 500) {
            console.error("AI gateway 5xx, retrying once", model);
            r = await callGateway(model, timeoutMs);
          }
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

    const parseAnimal = async (r: Response, model: string) => {
      const d = await r.json();
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return null;
      rawModelOutput = typeof tc.function?.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function?.arguments ?? null);
      usedModel = model;
      try {
        return JSON.parse(tc.function.arguments);
      } catch {
        return null;
      }
    };


    // 1) Passe économique (Flash Lite) — couvre la grande majorité des animaux.
    //    12 s suffisent largement (médiane ~2,5 s) ; au-delà l'appel est bloqué,
    //    on repart sur une requête neuve plutôt que d'attendre.
    let response = await tryModel(FAST_MODEL, 12_000, 2);
    let animalData = response?.ok ? await parseAnimal(response, FAST_MODEL) : null;


    // 2) Second passage sur Flash (modèle bon marché, pas de Pro) uniquement
    // quand Lite échoue ou est franchement incertain.
    const CONFUSABLE = /(chevreuil|biche|cerf|daim|faon|coccinelle|mesange|mésange|pouillot|goeland|goéland|mouette|hirondelle|martinet|bourdon|abeille|corneille|corbeau|choucas|lezard|lézard|pipistrelle)/i;
    const label = String(animalData?.animal_name || "");
    const confidence = typeof animalData?.confidence === "number" ? animalData.confidence : -1;
    const needsDeep =
      !animalData ||
      confidence < 60 ||
      (CONFUSABLE.test(label) && confidence < 75);

    if (needsDeep) {
      // Budget restant : 24 s (2× Lite) + 20 s = 44 s max, sous le timeout client.
      const deep = await tryModel(DEEP_MODEL, 20_000);
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
      return new Response(
        JSON.stringify({
          success: false,
          reason: "not_a_real_photo",
          image_type: imageType,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    if (!animalData) {
      if (response && !response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", response.status);
        return new Response(JSON.stringify({ error: "Erreur d'identification" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!response) {
        return new Response(JSON.stringify({ error: "Analyse interrompue (réseau)" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Vraie non-reconnaissance : on répond 200 pour que le client bascule
      // sur la saisie manuelle (et non sur l'écran d'erreur technique).
      return new Response(JSON.stringify({ success: false, reason: "not_identified" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        const { data: matches, error: matchErr } = await admin.rpc("match_animal", {
          p_name: animalData.animal_name,
          p_scientific: animalData.scientific_name || null,
        });
        if (matchErr) console.error("match_animal failed", matchErr);
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

        return new Response(
          JSON.stringify({
            success: false,
            reason: "unverified_species",
            hint,
            suggestion: verdict.fallbackName
              ? { scientific_name: verdict.fallbackName, rank: verdict.fallbackRank }
              : null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    return new Response(JSON.stringify({ success: true, animal: animalData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });


  } catch (e) {
    console.error("identify-animal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
