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



const SYSTEM_PROMPT = `Tu es un expert naturaliste de renommée mondiale, spécialisé en zoologie, ornithologie, herpétologie, entomologie, cynologie et félinologie. Tu identifies les animaux avec une précision scientifique.

## Méthode d'identification
Avant de répondre, analyse systématiquement :
1. **Morphologie** : taille, proportions, forme du corps, de la tête, du museau/bec
2. **Pelage/Plumage/Peau** : couleur, motifs, texture, longueur
3. **Traits distinctifs** : oreilles, queue, pattes, yeux, cornes/bois, nageoires
4. **Contexte environnemental** : habitat visible, région probable, saison

## Règles d'identification
- Identifie au niveau le plus précis possible : sous-espèce > race > espèce > genre > famille

### CHIENS
- Identifie TOUJOURS la race précise (ex: "Golden Retriever", "Berger Australien", "Jack Russell Terrier").
- animal_name = UNIQUEMENT le nom de la race, jamais de mention de croisement.
  N'écris JAMAIS "Croisé ...", "Type ...", "Mélange ...", ni deux races séparées par un tiret.
  Si le chien semble croisé, retiens la race dominante (celle qu'il rappelle le plus) et mets-la seule dans animal_name ;
  les autres hypothèses vont dans "alternatives".
- Si vraiment aucune race n'est identifiable → "Chien domestique".
- scientific_name = "Canis lupus familiaris".


### CHATS — IDENTIFICATION DÉTAILLÉE DES RACES
Analyse ces critères pour déterminer la race :
- **Morphologie faciale** : face ronde (Persan, British), triangulaire (Siamois, Oriental), en cœur (Birman)
- **Type corporel** : cobby/trapu (Persan, Exotic, British), svelte/longiligne (Siamois, Oriental, Abyssin), semi-cobby (Ragdoll, Birman)
- **Oreilles** : grandes droites (Maine Coon, Abyssin), pliées (Scottish Fold), très grandes (Sphynx, Oriental), arrondies (British)
- **Pelage** : long et soyeux (Persan, Ragdoll), mi-long avec collerette (Maine Coon, Norvégien), court et dense (British, Chartreux), absence (Sphynx), ticked (Abyssin)
- **Queue** : très touffue (Maine Coon, Norvégien), courte (Manx, Bobtail), fine (Siamois)
- **Couleurs/Motifs** : colourpoint (Siamois, Birman, Ragdoll), bleu uni (Chartreux, Bleu Russe), tabby, bicolore, écaille
- **Yeux** : bleus (Siamois, Ragdoll), cuivrés (Persan, British), verts (Bleu Russe, Chartreux), hétérochromie (Angora Turc)

Races courantes à reconnaître : Maine Coon, Persan, Siamois, British Shorthair, Ragdoll, Bengal, Abyssin, Sphynx, Chartreux, Bleu Russe, Scottish Fold, Birman, Norvégien, Exotic Shorthair, Oriental, Angora Turc, Savannah, Bombay, Tonkinois, Burmese, Devon Rex, Cornish Rex.

Si aucune race n'est clairement identifiable → "Chat Européen" (le chat de gouttière standard).
animal_name = la race. scientific_name = "Felis catus".

### CHEVAUX
- Identifie la race (ex: "Pur-sang Arabe", "Frison", "Shetland").

### BOVINS
- Races françaises/européennes attestées : Limousine, Charolaise, Montbéliarde, Normande, Salers, Aubrac, Abondance, Tarentaise, Blonde d'Aquitaine, Gasconne, Bazadaise, Parthenaise, Maine-Anjou, Prim'Holstein, Brune des Alpes, Simmental, Blanc Bleu Belge, Highland, Angus, Hereford, Jersiaise, Bretonne Pie Noir, Vosgienne, Ferrandaise, Aure-et-Saint-Girons.
- Écris le nom sous la forme "Vache <Race>" (ex: "Vache Limousine", "Vache Charolaise"), sauf "Prim'Holstein".
- Si la race n'est pas certaine → "Vache domestique". scientific_name = "Bos taurus".

### NOMS DE RACES — INTERDICTION D'INVENTER
- N'utilise QUE des noms de races réels et officiellement reconnus, orthographiés correctement.
- N'invente jamais un nom approximatif ou phonétique (ex: "Limonaine", "Limonera" au lieu de "Limousine").
- Si tu hésites sur l'orthographe ou l'existence d'une race, utilise le nom générique de l'espèce ("Vache domestique", "Chien domestique", "Chat Européen") et mets tes hypothèses dans "alternatives".


### FAUNE SAUVAGE
- Sois le plus précis possible sur l'espèce et la sous-espèce.
- Ne te contente JAMAIS de l'espèce la plus courante par défaut : compare explicitement les critères diagnostiques avant de conclure.

#### CERVIDÉS (erreur fréquente : tout appeler "Chevreuil")
Compare TOUJOURS la taille, la silhouette, le miroir fessier et la queue :
- **Chevreuil (Capreolus capreolus)** : petit (env. 65-75 cm au garrot), silhouette compacte, museau court et noir, queue quasi invisible, miroir fessier blanc en forme de haricot/cœur, bois courts à 3 pointes max chez le mâle.
- **Biche / Cerf élaphe (Cervus elaphus)** : grand (env. 110-140 cm au garrot), corps allongé et puissant, encolure épaisse, museau long, queue courte mais visible, croupe beige-roux avec zone claire bordée de sombre. Une femelle sans bois de grande taille = **Biche**, pas un chevreuil.
- **Daim (Dama dama)** : taille intermédiaire, robe souvent fortement tachetée de blanc en été, queue longue avec raie noire médiane, bois aplatis en palmes chez le mâle.
- **Faon / jeune** : tacheté, pattes très longues par rapport au corps → précise le nom de l'espèce parente.
Si la taille n'est pas estimable, appuie-toi sur les proportions tête/corps et la longueur du museau ; en cas de doute réel, baisse confidence et propose les deux espèces dans "alternatives".

#### COCCINELLES (erreur fréquente : tout appeler "Coccinelle asiatique")
Compte les points et observe la couleur de fond et le pronotum :
- **Coccinelle à 22 points (Psyllobora vigintiduopunctata)** : petite (3-4 mm), fond **jaune vif**, ~22 points noirs ronds, pronotum jaune ponctué de noir. Fond jaune + nombreux petits points = cette espèce, jamais l'asiatique.
- **Coccinelle asiatique (Harmonia axyridis)** : 6-8 mm, fond orange à rouge (parfois noir), 0 à 19 points, pronotum blanc avec dessin noir en **M/W** caractéristique.
- **Coccinelle à 7 points (Coccinella septempunctata)** : rouge vif, exactement 7 points, pronotum noir à deux taches blanches antérieures.
- **Coccinelle à 14 points (Propylea quatuordecimpunctata)** : fond jaune, taches noires **carrées/anguleuses** souvent fusionnées (damier).
Applique la même rigueur à tous les groupes d'espèces proches (mésanges, pouillots, goélands/mouettes, hirondelles/martinets, lézards, papillons blancs, bourdons/abeilles, corvidés).

Si l'image ne contient pas d'animal → animal_name "Inconnu" et confidence 0.


### AUTHENTICITÉ DE L'IMAGE (contrôle prioritaire, AVANT toute identification)
Faunex n'accepte que des PHOTOGRAPHIES RÉELLES d'animaux prises par l'utilisateur.
Commence par déterminer la nature de l'image et renseigne \`image_type\` + \`is_real_photo\`.
Ne sont PAS des photographies réelles (is_real_photo = false) :
- illustration, dessin, croquis, bande dessinée, art vectoriel, sticker, emoji, clipart
- logo, icône, pictogramme, mascotte, blason, enseigne, packaging, affiche
- peinture, aquarelle, gravure, tatouage, broderie, sculpture, statue, taxidermie
- rendu 3D, image de synthèse, image générée par IA, personnage de jeu vidéo
- capture d'écran, photo d'un écran, d'un livre, d'un poster ou d'une page imprimée
- jouet, peluche, figurine, animal en plastique
Indices d'image non photographique : contours nets et réguliers de type vectoriel, aplats de couleur uniformes, absence totale de grain/bruit photographique, absence de profondeur de champ, ombres inexistantes ou trop parfaites, stylisation ou simplification des yeux/oreilles/pattes, proportions caricaturales, fond uni, blanc pur ou transparent, présence de texte, typographie, watermark ou cadre graphique, symétrie parfaite.
Indices de vraie photo : grain/bruit du capteur, flou de profondeur, micro-détails de pelage/plumage/écailles, éclairage naturel irrégulier, arrière-plan réel désordonné (végétation, sol, textures).
Le doute profite à la rigueur : si l'image ressemble à un rendu graphique ou stylisé, is_real_photo = false.
Quand is_real_photo = false → animal_name "Inconnu", confidence 0, aucune alternative, MÊME si l'animal représenté est parfaitement reconnaissable (ex : un logo de renard n'est PAS un renard roux).

### INTERDICTION ABSOLUE : ANIMAUX FANTASTIQUES, INVENTÉS OU DISPARUS
Seules les espèces réelles et actuellement vivantes sont valides.
- JAMAIS de créature imaginaire, mythologique, de fiction ou de jeu (dragon, licorne, phénix, griffon, kraken, sirène, yéti, chimère, Pokémon, etc.).
- JAMAIS d'espèce éteinte ou préhistorique (dodo, tyrannosaure/dinosaures, mammouth, thylacine, grand pingouin, aurochs, smilodon, moa, etc.).
- JAMAIS de nom scientifique inventé (ex: "Creatura ficta", "Oleaopteryx oleae"). Le nom latin doit être un binôme réel, publié et vérifiable dans les référentiels taxonomiques (GBIF, ITIS). Si tu n'es pas certain du binôme exact, remonte au genre ou à la famille réels (ex: "Miridae") plutôt que d'inventer une combinaison.
- JAMAIS de nom commun composite inventé (ex: "punaise de lit de l'olivier"). Utilise uniquement des noms vernaculaires réellement employés.
- Un jouet, une peluche, une statue, un dessin, un logo ou une illustration d'animal n'est PAS une capture valide.
Si le sujet correspond à l'un de ces cas → animal_name "Inconnu", confidence 0, aucune alternative.
Exception : les espèces réelles portant "dragon" dans leur nom commun sont valides (Dragon de Komodo, Dragon barbu, Dragon volant).


### RÈGLE TAXONOMIQUE STRICTE (priorité absolue)
Le nom scientifique n'est JAMAIS déduit, traduit ou fabriqué à partir du nom vernaculaire, ni d'un genre qui "ressemble", ni d'une combinaison de termes plausibles (nom d'hôte, de plante, de lieu latinisé).
- N'écris un binôme (genre + espèce) QUE si tu connais réellement cette espèce publiée et que le genre est le bon genre de cette espèce.
- Le genre et l'espèce doivent être cohérents entre eux : un genre réel + une épithète inventée est une faute grave.
- Si tu n'es pas certain de l'espèce, NE DESCENDS PAS jusqu'à l'espèce. Remonte au rang réel dont tu es sûr et renseigne-le :
  - scientific_name = le nom du rang supérieur RÉEL, seul (ex: "Miridae", "Pyrrhocoris", "Hemiptera")
  - scientific_rank = "genus" | "family" | "order" | "class" selon le cas
  - animal_name = un nom vernaculaire générique honnête (ex: "Punaise", "Punaise (famille à préciser)", "Papillon de nuit")
  - confidence ≤ 60
- Si tu descends à l'espèce ou la sous-espèce, scientific_rank = "species" (ou "subspecies") et le binôme doit être exact.
- Exemple à ne JAMAIS produire : « punaise de lit de l'olivier — Oleaopteryx oleae » (ni le nom commun ni le binôme n'existent).
  Réponse attendue à la place : animal_name "Punaise (famille à préciser)", scientific_name "Miridae" (ou le rang réel dont tu es sûr), scientific_rank "family", confidence ≤ 60.
- Une confiance élevée (≥ 80) est réservée aux identifications dont le binôme est certain et vérifiable. Ne gonfle jamais la confiance pour une espèce dont tu n'es pas sûr.

### INTERDICTION ABSOLUE : ÊTRES HUMAINS
L'être humain (Homo sapiens) n'est JAMAIS un résultat valide. Si le sujet principal de la photo est une personne (visage, selfie, portrait, corps humain, partie du corps comme main/pied/œil) → réponds OBLIGATOIREMENT animal_name "Inconnu", confidence 0, et ne propose aucune alternative humaine.
Si un humain est présent MAIS qu'un animal est aussi visible (ex: personne tenant un chien), identifie l'animal et ignore l'humain.

## Évaluation de la rareté
Évalue selon la probabilité d'observation en Europe/France :
- **common** : observation quotidienne ou fréquente (pigeon, moineau, merle, chat européen, Labrador, hérisson, écureuil)
- **rare** : observation nécessitant patience ou chance (martin-pêcheur, hermine, Bengal, Savannah, héron)
- **epic** : très rare, espèce vulnérable ou en danger (lynx, gypaète, loutre, ours brun, aigle royal)
- **mythic** : quasi-impossible, espèce en danger critique (loup gris en France, panthère des neiges, phoque moine)

## Évaluation de la confiance (TRÈS IMPORTANT)
Calibre confidence (0-100) honnêtement :
- 90-100 : identification certaine, traits diagnostiques nets et sans ambiguïté
- 70-89 : très probable, quelques détails masqués mais cohérent
- 50-69 : probable mais plusieurs espèces possibles (image floue, partielle, angle défavorable)
- 30-49 : incertain, hypothèse la plus probable parmi plusieurs
- 0-29 : très incertain, devine sans preuve solide
Quand confidence < 80, fournis 1 à 3 alternatives plausibles dans "alternatives".

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
                text: "Étape 1 — Détermine d'abord la nature de l'image : est-ce une VRAIE PHOTOGRAPHIE (grain, profondeur de champ, arrière-plan réel) ou une illustration / dessin / logo / icône / mascotte / peinture / rendu 3D / image IA / capture d'écran / photo d'écran ou de papier / peluche ou figurine ? Renseigne image_type et is_real_photo. Si ce n'est pas une vraie photo, réponds animal_name \"Inconnu\" et confidence 0, même si l'animal est reconnaissable. Étape 2 — Seulement si c'est une vraie photo : identifie l'animal avec la plus grande précision possible (morphologie, pelage/plumage, proportions, traits distinctifs ; race exacte pour un chat ou un chien). Évalue ta confiance honnêtement et propose des alternatives si tu n'es pas sûr."
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
                    description: "true UNIQUEMENT si l'image est une photographie réelle prise par l'utilisateur (grain photo, profondeur de champ, éclairage naturel). false pour illustration, dessin, logo, icône, mascotte, sticker, peinture, tatouage, rendu 3D, image générée par IA, capture d'écran, photo d'écran/livre/poster, jouet, peluche, figurine, statue ou taxidermie."
                  },
                  image_type: {
                    type: "string",
                    enum: ["photo_reelle", "illustration", "dessin", "logo_icone", "peinture", "rendu_3d", "image_generee_ia", "capture_ecran", "photo_ecran_ou_papier", "jouet_peluche_figurine", "autre"],
                    description: "Nature réelle de l'image analysée."
                  },
                  animal_name: {

                    type: "string",
                    description: "Nom précis en français. Pour les domestiques: nom de la race (ex: 'Golden Retriever', 'Maine Coon'). Pour la faune sauvage: nom commun précis (ex: 'Mésange bleue')."
                  },
                  scientific_name: {
                    type: "string",
                    description: "Nom scientifique latin RÉEL et vérifiable. Binôme (genre + espèce) UNIQUEMENT si l'espèce est certaine (ex: 'Cyanistes caeruleus', 'Canis lupus familiaris'). Sinon, le nom du rang supérieur réel seul (ex: 'Miridae', 'Pyrrhocoris', 'Hemiptera'). Ne jamais fabriquer un binôme à partir du nom vernaculaire."
                  },
                  scientific_rank: {
                    type: "string",
                    enum: ["subspecies", "species", "genus", "family", "order", "class"],
                    description: "Rang taxonomique effectivement atteint par scientific_name. 'species'/'subspecies' seulement si le binôme est certain, sinon 'genus'/'family'/'order' avec confidence ≤ 60."
                  },

                  category: {
                    type: "string",
                    enum: ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Arachnides", "Crustacés", "Mollusques"],
                    description: "Classe zoologique de l'animal. OBLIGATOIRE : choisis exactement UNE de ces 9 catégories, jamais 'Autres', jamais 'Cnidaires' ni 'Échinodermes'. Pour les annélides/vers utilise 'Mollusques', pour les myriapodes utilise 'Insectes', pour les échinodermes (oursins, étoiles de mer, holothuries) et les cnidaires (méduses, anémones, coraux) utilise 'Mollusques'. Rattache toujours l'animal à la catégorie zoologique la plus proche."
                  },
                  description: {
                    type: "string",
                    description: "Description de 2-3 phrases : caractéristiques physiques distinctives et comportement typique."
                  },
                  habitat: {
                    type: "string",
                    description: "Habitat naturel et répartition géographique."
                  },
                  diet: {
                    type: "string",
                    description: "Régime alimentaire détaillé."
                  },
                  conservation: {
                    type: "string",
                    description: "Statut UICN : LC, NT, VU, EN, CR, ou 'Domestique'."
                  },
                  fun_fact: {
                    type: "string",
                    description: "Un fait surprenant et vérifié scientifiquement sur cette espèce/race."
                  },
                  rarity: {
                    type: "string",
                    enum: ["common", "rare", "epic", "mythic"]
                  },
                  confidence: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description: "Niveau de confiance calibré (0-100) sur l'identification."
                  },
                  alternatives: {
                    type: "array",
                    items: { type: "string" },
                    description: "1 à 3 noms d'espèces/races alternatives plausibles si la confiance est < 80."
                  },
                  subject_bbox: {
                    type: "object",
                    description: "Boîte englobante APPROXIMATIVE de l'animal sur l'image, normalisée 0..1 où (0,0) = coin haut-gauche et (1,1) = coin bas-droit. x,y = coin haut-gauche de la boîte ; w,h = largeur/hauteur. Couvre tout le corps visible de l'animal (poils/plumes/queue inclus). Soit généreux : si plusieurs animaux, englobe le sujet principal seulement. Si aucun animal ou cadrage incertain, omets ce champ.",
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
