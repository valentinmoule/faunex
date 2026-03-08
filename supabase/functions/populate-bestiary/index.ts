import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  { name: "Mammifères terrestres de France", category: "Mammifères", count: 120 },
  { name: "Oiseaux de France (nicheurs, migrateurs, hivernants)", category: "Oiseaux", count: 400 },
  { name: "Reptiles de France métropolitaine", category: "Reptiles", count: 40 },
  { name: "Amphibiens de France métropolitaine", category: "Amphibiens", count: 40 },
  { name: "Poissons d'eau douce et marins remarquables de France", category: "Poissons", count: 150 },
  { name: "Insectes remarquables de France (papillons, coléoptères, libellules, hyménoptères)", category: "Insectes", count: 200 },
  { name: "Arachnides et myriapodes de France", category: "Arachnides", count: 30 },
  { name: "Crustacés de France (eau douce et marins)", category: "Crustacés", count: 30 },
  { name: "Mollusques de France (terrestres et marins)", category: "Mollusques", count: 40 },
  { name: "Mammifères marins observables en France", category: "Mammifères marins", count: 30 },
  { name: "Grands mammifères et prédateurs du monde (hors France)", category: "Mammifères (monde)", count: 200 },
  { name: "Oiseaux emblématiques du monde (hors France)", category: "Oiseaux (monde)", count: 200 },
  { name: "Reptiles et amphibiens emblématiques du monde (hors France)", category: "Reptiles (monde)", count: 100 },
  { name: "Poissons et créatures marines remarquables du monde", category: "Vie marine (monde)", count: 150 },
  { name: "Insectes et invertébrés remarquables du monde (hors France)", category: "Insectes (monde)", count: 100 },
];

const RARITY_RULES = `
Attribue la rareté selon le statut de conservation RÉEL de l'espèce:
- "common": espèces très communes, préoccupation mineure (LC), populations stables et abondantes
- "uncommon": espèces assez communes mais moins fréquentes, LC mais plus discrètes
- "rare": espèces peu communes, quasi menacées (NT) ou localisées
- "epic": espèces vulnérables (VU) ou en danger (EN)
- "legendary": espèces en danger critique (CR) ou très rares
- "mythic": espèces exceptionnellement rares, éteintes à l'état sauvage (EW) ou quasi-mythiques
`;

async function generateBatch(
  apiKey: string,
  supabaseUrl: string,
  prompt: string,
  category: string,
  count: number
): Promise<{ name: string; scientific_name: string; rarity: string }[]> {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/identify-animal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }
  );

  // Use Lovable AI directly
  const aiUrl = "https://ai-gateway.lovable.dev/v1/chat/completions";
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const aiResponse = await fetch(aiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Tu es un biologiste expert. Tu génères des listes d'espèces animales au format JSON.
${RARITY_RULES}
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication.
Format: [{"name":"Nom français","scientific_name":"Nom latin","rarity":"common|uncommon|rare|epic|legendary|mythic"}]`,
        },
        {
          role: "user",
          content: `Génère une liste de ${count} espèces de la catégorie "${prompt}". 
Inclus le maximum d'espèces réelles et connues.
Utilise les noms français courants.
Assure-toi que chaque espèce est unique.
Pas de doublons, pas d'espèces inventées.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    }),
  });

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    console.error(`AI error for ${category}:`, err);
    return [];
  }

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || "";

  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error(`No JSON found for ${category}:`, content.substring(0, 200));
    return [];
  }

  try {
    const species = JSON.parse(jsonMatch[0]);
    return species.map((s: any) => ({
      name: s.name,
      scientific_name: s.scientific_name,
      rarity: ["common", "uncommon", "rare", "epic", "legendary", "mythic"].includes(s.rarity)
        ? s.rarity
        : "common",
    }));
  } catch (e) {
    console.error(`JSON parse error for ${category}:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get optional category index from request body
    let startIndex = 0;
    try {
      const body = await req.json();
      startIndex = body.startIndex || 0;
    } catch {}

    const results: { category: string; inserted: number; errors: number }[] = [];
    let totalInserted = 0;

    // Process one category at a time to stay within time limits
    const cat = CATEGORIES[startIndex];
    if (!cat) {
      return new Response(
        JSON.stringify({ done: true, message: "All categories processed", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing: ${cat.name} (${cat.count} species)`);

    const species = await generateBatch(
      lovableKey,
      supabaseUrl,
      cat.name,
      cat.category,
      cat.count
    );

    let inserted = 0;
    let errors = 0;

    // Insert in batches of 50
    for (let i = 0; i < species.length; i += 50) {
      const batch = species.slice(i, i + 50).map((s) => ({
        name: s.name,
        scientific_name: s.scientific_name,
        category: cat.category,
        rarity: s.rarity,
      }));

      const { error } = await supabase.from("animals").upsert(batch, {
        onConflict: "name",
        ignoreDuplicates: true,
      });

      if (error) {
        console.error(`Insert error:`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    totalInserted += inserted;
    results.push({ category: cat.category, inserted, errors });

    // Get total count
    const { count } = await supabase
      .from("animals")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        done: startIndex >= CATEGORIES.length - 1,
        nextIndex: startIndex + 1,
        totalInDb: count,
        processed: cat.name,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
