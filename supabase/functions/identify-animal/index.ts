import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
- Pour les CHIENS : identifie toujours la race précise (ex: "Golden Retriever", "Berger Australien", "Shiba Inu"). Si croisé, indique les races probables (ex: "Croisé Labrador-Berger"). Le animal_name = la race, le scientific_name = "Canis lupus familiaris".
- Pour les CHATS : identifie la race si identifiable (ex: "Maine Coon", "Siamois", "British Shorthair"). Si chat européen sans race distincte, utilise "Chat Européen". Le scientific_name = "Felis catus".
- Pour les CHEVAUX : identifie la race (ex: "Pur-sang Arabe", "Frison", "Shetland").
- Pour la FAUNE SAUVAGE : sois le plus précis possible sur l'espèce et la sous-espèce si identifiable.
- Si l'image ne contient pas d'animal ou si c'est totalement non identifiable, utilise animal_name "Inconnu".

## Évaluation de la rareté
Évalue la rareté selon la probabilité d'observation en Europe/France :
- **common** : observation quotidienne facile (pigeon, moineau, merle, chat européen, Labrador, Berger Allemand)
- **uncommon** : courant mais pas omniprésent (hérisson, écureuil roux, héron cendré, Shiba Inu, Maine Coon)
- **rare** : observation nécessitant patience ou chance (martin-pêcheur, hermine, blaireau, Azawakh, Mudi)
- **epic** : très rare ou limité géographiquement (lynx boréal, gypaète barbu, loutre d'Europe, Otterhound)
- **legendary** : exceptionnel, espèce menacée ou très discrète (ours brun, aigle royal, phoque moine, vison d'Europe)
- **mythic** : quasi-impossible à observer en liberté (loup gris en France, panthère des neiges, léopard de l'Amour)

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette photo en détail et identifie l'animal avec la plus grande précision possible. Examine attentivement la morphologie, le pelage/plumage, les proportions et tout trait distinctif."
              },
              { type: "image_url", image_url: { url: imageBase64 } }
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
                    description: "Nom précis en français. Pour les animaux domestiques, utiliser le nom de la race (ex: 'Golden Retriever', 'Maine Coon'). Pour la faune sauvage, le nom commun le plus précis (ex: 'Mésange bleue', 'Renard roux')."
                  },
                  scientific_name: {
                    type: "string",
                    description: "Nom scientifique latin complet (genre + espèce, et sous-espèce si identifiable). Ex: 'Parus caeruleus', 'Vulpes vulpes'."
                  },
                  category: {
                    type: "string",
                    enum: ["Mammifères", "Oiseaux", "Reptiles", "Amphibiens", "Poissons", "Insectes", "Arachnides", "Crustacés", "Mollusques", "Autres"],
                    description: "Classe zoologique de l'animal"
                  },
                  description: {
                    type: "string",
                    description: "Description de 2-3 phrases incluant les caractéristiques physiques distinctives et le comportement typique de cette espèce/race."
                  },
                  habitat: {
                    type: "string",
                    description: "Habitat naturel principal et répartition géographique. Ex: 'Forêts mixtes et jardins d'Europe occidentale'."
                  },
                  diet: {
                    type: "string",
                    description: "Régime alimentaire détaillé (omnivore/herbivore/carnivore + aliments principaux)."
                  },
                  conservation: {
                    type: "string",
                    description: "Statut UICN précis : LC (Préoccupation mineure), NT (Quasi menacé), VU (Vulnérable), EN (En danger), CR (En danger critique), ou 'Domestique' pour les animaux de compagnie."
                  },
                  fun_fact: {
                    type: "string",
                    description: "Un fait surprenant, méconnu et vérifié scientifiquement sur cette espèce/race. Doit être captivant et éducatif."
                  },
                  rarity: {
                    type: "string",
                    enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
                  }
                },
                required: ["animal_name", "scientific_name", "category", "description", "habitat", "diet", "conservation", "fun_fact", "rarity"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "identify_animal" } },
      }),
    });

    if (!response.ok) {
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur d'identification" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "L'IA n'a pas pu identifier l'animal" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const animalData = JSON.parse(toolCall.function.arguments);

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
