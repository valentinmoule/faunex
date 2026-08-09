import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

### FAUNE SAUVAGE
- Sois le plus précis possible sur l'espèce et la sous-espèce.

Si l'image ne contient pas d'animal → animal_name "Inconnu" et confidence 0.

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

    // Cost optimisation : Flash Lite is the cheapest Gemini vision model.
    // We escalate to Pro only when Lite is unsure, keeping most common
    // animals (dogs, cats, pigeons, common birds) on the cheapest path.
    const FAST_MODEL = "google/gemini-2.5-flash-lite";
    const DEEP_MODEL = "google/gemini-2.5-pro";

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
                text: "Analyse cette photo en détail et identifie l'animal avec la plus grande précision possible. Examine attentivement la morphologie, le pelage/plumage, les proportions et tout trait distinctif. Si c'est un chat ou un chien, détermine la race exacte. Évalue ta confiance honnêtement et propose des alternatives si tu n'es pas sûr."
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
                  animal_name: {
                    type: "string",
                    description: "Nom précis en français. Pour les domestiques: nom de la race (ex: 'Golden Retriever', 'Maine Coon'). Pour la faune sauvage: nom commun précis (ex: 'Mésange bleue')."
                  },
                  scientific_name: {
                    type: "string",
                    description: "Nom scientifique latin complet (genre + espèce). Ex: 'Parus caeruleus', 'Canis lupus familiaris'."
                  },
                  category: {
                    type: "string",
                    enum: ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Arachnides", "Crustacés", "Mollusques"],
                    description: "Classe zoologique de l'animal. OBLIGATOIRE : choisis exactement UNE de ces 9 catégories, jamais 'Autres'. Pour les annélides/vers utilise 'Mollusques', pour les myriapodes utilise 'Insectes', pour les échinodermes utilise 'Mollusques'. Rattache toujours l'animal à la catégorie zoologique la plus proche."
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
                required: ["animal_name", "scientific_name", "category", "description", "habitat", "diet", "conservation", "fun_fact", "rarity", "confidence"],
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

    const tryModel = async (model: string, timeoutMs: number) => {
      try {
        let r = await callGateway(model, timeoutMs);
        if (!r.ok && r.status >= 500) {
          console.error("AI gateway 5xx, retrying once", model);
          r = await callGateway(model, timeoutMs);
        }
        return r;
      } catch (netErr) {
        console.error("AI gateway network failure", model, netErr);
        return null;
      }
    };

    const parseAnimal = async (r: Response) => {
      const d = await r.json();
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return null;
      try {
        return JSON.parse(tc.function.arguments);
      } catch {
        return null;
      }
    };

    // 1) Cheap pass (Flash Lite) — covers the vast majority of common animals.
    let response = await tryModel(FAST_MODEL, 30_000);
    let animalData = response?.ok ? await parseAnimal(response) : null;

    // 2) Escalate to Pro only when Lite is unsure or fails.
    // Threshold raised to 70 so only genuinely ambiguous cases hit the expensive model.
    const needsDeep =
      !animalData ||
      typeof animalData.confidence !== "number" ||
      animalData.confidence < 70 ||
      String(animalData.animal_name || "").toLowerCase() === "inconnu";

    if (needsDeep) {
      const deep = await tryModel(DEEP_MODEL, 60_000);
      if (deep?.ok) {
        const deepData = await parseAnimal(deep);
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


    // Déduplication : si l'espèce existe déjà dans le bestiaire (nom commun OU nom
    // scientifique, insensible casse/accents/tirets), on réutilise la fiche canonique
    // pour éviter les doublons type "Graphosome rayé" / "Graphosome d'Italie".
    if (animalData?.animal_name && animalData.animal_name.toLowerCase() !== "inconnu") {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: matches, error: matchErr } = await supabase.rpc("match_animal", {
          p_name: animalData.animal_name,
          p_scientific: animalData.scientific_name || null,
        });
        if (matchErr) console.error("match_animal failed", matchErr);
        const existing = Array.isArray(matches) ? matches[0] : matches;
        if (existing) {
          animalData.animal_name = existing.name || animalData.animal_name;
          animalData.scientific_name = existing.scientific_name || animalData.scientific_name;
          animalData.category = existing.category || animalData.category;
          animalData.rarity = existing.rarity || animalData.rarity;
        }
      } catch (e) {
        console.error("dedup lookup failed", e);
      }
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
