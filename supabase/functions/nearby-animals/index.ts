import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { latitude, longitude } = await req.json();
    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: "Coordonnées manquantes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es un expert naturaliste et zoologue. L'utilisateur te donne des coordonnées GPS. Tu dois retourner une liste de exactement 3 animaux sauvages qu'on peut réellement observer dans cette zone géographique, en tenant compte de la saison actuelle (${new Date().toLocaleDateString('fr-FR', { month: 'long' })}).

IMPORTANT : Priorise les espèces par ordre de pertinence :
1. Rareté (privilégie au moins 1 espèce rare/epic/mythic si réaliste)
2. Proximité (espèces typiques de cet écosystème précis)
3. Nouveauté (espèces surprenantes ou peu connues du grand public)

Pour chaque animal, donne :
- name: nom commun en français
- scientific_name: nom scientifique
- category: catégorie (Mammifères, Oiseaux, Reptiles, Amphibiens, Insectes, Poissons)
- rarity: une rareté parmi common, rare, epic, mythic (basée sur la difficulté réelle d'observation)
- description: une phrase courte décrivant l'animal
- tip: un conseil pour l'observer (lieu, moment de la journée, comportement à guetter)

Sois réaliste et précis selon la géographie et l'écosystème local.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Coordonnées GPS : ${latitude}, ${longitude}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_nearby_animals",
              description: "Retourne la liste des animaux observables près des coordonnées données.",
              parameters: {
                type: "object",
                properties: {
                  location_name: { type: "string", description: "Nom de la zone géographique (ex: 'Forêt de Fontainebleau, France')" },
                  animals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        scientific_name: { type: "string" },
                        category: { type: "string" },
                        rarity: { type: "string", enum: ["common", "rare", "epic", "mythic"] },
                        description: { type: "string" },
                        tip: { type: "string" },
                      },
                      required: ["name", "scientific_name", "category", "rarity", "description", "tip"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["location_name", "animals"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_nearby_animals" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaye dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nearby-animals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
