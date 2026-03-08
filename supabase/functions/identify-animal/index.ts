import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert naturaliste. Quand on te montre une photo d'animal, tu dois l'identifier précisément.
Réponds UNIQUEMENT avec un appel à la fonction identify_animal. Si ce n'est pas un animal, utilise animal_name "Inconnu".
Pour la rareté, évalue selon la fréquence d'observation en milieu naturel:
- common: animaux très courants (pigeons, moineaux, chats, chiens)
- uncommon: assez courants mais pas partout (hérissons, écureuils, hérons)
- rare: difficiles à observer (martins-pêcheurs, blaireaux, hermines)
- epic: très rares ou régionaux (lynx, gypaète, loutre)
- legendary: exceptionnels (ours brun, aigle royal, phoque moine)
- mythic: quasi impossible à observer en milieu naturel (loup gris, panthère des neiges)`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identifie cet animal sur la photo." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_animal",
              description: "Identifie un animal à partir d'une photo",
              parameters: {
                type: "object",
                properties: {
                  animal_name: { type: "string", description: "Nom commun en français" },
                  scientific_name: { type: "string", description: "Nom scientifique latin" },
                  category: { type: "string", description: "Catégorie (Mammifères, Oiseaux, Reptiles, Amphibiens, Poissons, Insectes, Arachnides, etc.)" },
                  description: { type: "string", description: "Description courte de l'animal (2-3 phrases)" },
                  habitat: { type: "string", description: "Habitat naturel" },
                  diet: { type: "string", description: "Régime alimentaire" },
                  conservation: { type: "string", description: "Statut de conservation UICN" },
                  fun_fact: { type: "string", description: "Un fait amusant ou surprenant" },
                  rarity: { type: "string", enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"] }
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
