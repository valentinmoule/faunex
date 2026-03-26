import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Quest templates pool
const QUEST_POOL = [
  {
    quest_type: "capture_count",
    title: "Chasseur du jour",
    description: "Capture 2 espèces aujourd'hui",
    icon: "📸",
    target: 2,
    xp_reward: 80,
  },
  {
    quest_type: "capture_count",
    title: "Triple capture",
    description: "Capture 3 espèces aujourd'hui",
    icon: "🎯",
    target: 3,
    xp_reward: 120,
  },
  {
    quest_type: "capture_different",
    title: "Diversité",
    description: "Capture 2 espèces différentes",
    icon: "🦎",
    target: 2,
    xp_reward: 100,
  },
  {
    quest_type: "capture_different",
    title: "Naturaliste curieux",
    description: "Capture 3 espèces différentes",
    icon: "🔬",
    target: 3,
    xp_reward: 150,
  },
  {
    quest_type: "capture_rarity",
    title: "Trouvaille rare",
    description: "Capture une espèce rare ou mieux",
    icon: "💎",
    target: 1,
    xp_reward: 150,
  },
  {
    quest_type: "capture_rarity",
    title: "Chasseur d'élite",
    description: "Capture 2 espèces rares ou mieux",
    icon: "⚡",
    target: 2,
    xp_reward: 250,
  },
  {
    quest_type: "new_zone",
    title: "Explorateur",
    description: "Explore une nouvelle zone aujourd'hui",
    icon: "🗺️",
    target: 1,
    xp_reward: 100,
  },
  {
    quest_type: "new_zone",
    title: "Globe-trotter",
    description: "Explore 2 zones différentes",
    icon: "🌍",
    target: 2,
    xp_reward: 180,
  },
  {
    quest_type: "capture_count",
    title: "Première du jour",
    description: "Fais ta première capture",
    icon: "🌅",
    target: 1,
    xp_reward: 40,
  },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all users who don't have quests for today
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id");

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;

    for (const profile of profiles) {
      // Check if user already has quests today
      const { count } = await supabase
        .from("daily_quests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("quest_date", today);

      if (count && count >= 3) continue;

      // Delete any partial/duplicate quests for today before regenerating
      if (count && count > 0) {
        await supabase
          .from("daily_quests")
          .delete()
          .eq("user_id", profile.user_id)
          .eq("quest_date", today);
      }

      // Pick 3 quests from different types
      const byType = new Map<string, typeof QUEST_POOL>();
      for (const q of QUEST_POOL) {
        if (!byType.has(q.quest_type)) byType.set(q.quest_type, []);
        byType.get(q.quest_type)!.push(q);
      }

      const types = [...byType.keys()].sort(() => Math.random() - 0.5).slice(0, 3);
      const selected = types.map((t) => {
        const pool = byType.get(t)!;
        return pool[Math.floor(Math.random() * pool.length)];
      });

      const rows = selected.map((q) => ({
        user_id: profile.user_id,
        quest_type: q.quest_type,
        title: q.title,
        description: q.description,
        icon: q.icon,
        target: q.target,
        xp_reward: q.xp_reward,
        quest_date: today,
      }));

      const { error } = await supabase.from("daily_quests").insert(rows);
      if (!error) generated++;
    }

    return new Response(
      JSON.stringify({ success: true, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-daily-quests error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
