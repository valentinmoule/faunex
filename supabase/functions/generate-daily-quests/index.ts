import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Expanded quest templates pool — variety is key!
const QUEST_POOL = [
  // capture_count variants
  { quest_type: "capture_count", title: "Première du jour", description: "Fais ta première capture", icon: "🌅", target: 1, xp_reward: 40 },
  { quest_type: "capture_count", title: "Chasseur du jour", description: "Capture 2 espèces aujourd'hui", icon: "📸", target: 2, xp_reward: 80 },
  { quest_type: "capture_count", title: "Triple capture", description: "Capture 3 espèces aujourd'hui", icon: "🎯", target: 3, xp_reward: 120 },
  { quest_type: "capture_count", title: "Marathonien", description: "Capture 5 espèces aujourd'hui", icon: "🏃", target: 5, xp_reward: 200 },
  { quest_type: "capture_count", title: "Frénésie de captures", description: "Capture 4 espèces aujourd'hui", icon: "🔥", target: 4, xp_reward: 160 },

  // capture_different variants
  { quest_type: "capture_different", title: "Diversité", description: "Capture 2 espèces différentes", icon: "🦎", target: 2, xp_reward: 100 },
  { quest_type: "capture_different", title: "Naturaliste curieux", description: "Capture 3 espèces différentes", icon: "🔬", target: 3, xp_reward: 150 },
  { quest_type: "capture_different", title: "Collectionneur", description: "Capture 4 espèces différentes", icon: "🗃️", target: 4, xp_reward: 200 },
  { quest_type: "capture_different", title: "Encyclopédiste", description: "Découvre 2 nouvelles espèces", icon: "📖", target: 2, xp_reward: 120 },

  // capture_rarity variants
  { quest_type: "capture_rarity", title: "Trouvaille rare", description: "Capture une espèce rare ou mieux", icon: "💎", target: 1, xp_reward: 150 },
  { quest_type: "capture_rarity", title: "Chasseur d'élite", description: "Capture 2 espèces rares ou mieux", icon: "⚡", target: 2, xp_reward: 250 },
  { quest_type: "capture_rarity", title: "Chercheur de trésors", description: "Trouve un animal rare", icon: "🏆", target: 1, xp_reward: 150 },
  { quest_type: "capture_rarity", title: "Légende vivante", description: "Trouve une espèce épique ou mythique", icon: "🌟", target: 1, xp_reward: 200 },

  // new_zone variants
  { quest_type: "new_zone", title: "Explorateur", description: "Explore une nouvelle zone aujourd'hui", icon: "🗺️", target: 1, xp_reward: 100 },
  { quest_type: "new_zone", title: "Globe-trotter", description: "Explore 2 zones différentes", icon: "🌍", target: 2, xp_reward: 180 },
  { quest_type: "new_zone", title: "Aventurier", description: "Capture dans un nouveau lieu", icon: "🧭", target: 1, xp_reward: 100 },
  { quest_type: "new_zone", title: "Nomade", description: "Explore 3 zones différentes", icon: "🏕️", target: 3, xp_reward: 250 },

  // share_app variants
  { quest_type: "share_app", title: "Ambassadeur", description: "Partage Faunex avec un ami", icon: "🔗", target: 1, xp_reward: 25 },
  { quest_type: "share_app", title: "Recruteur", description: "Invite un ami à rejoindre Faunex", icon: "📢", target: 1, xp_reward: 25 },
  { quest_type: "share_app", title: "Bouche-à-oreille", description: "Fais découvrir Faunex autour de toi", icon: "🗣️", target: 1, xp_reward: 25 },
];

// Seeded random to get consistent but daily-varying results
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr: string, userId: string): number {
  let hash = 0;
  const combined = dateStr + userId;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get all users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, level");

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

      // Delete any partial/duplicate quests for today
      if (count && count > 0) {
        await supabase
          .from("daily_quests")
          .delete()
          .eq("user_id", profile.user_id)
          .eq("quest_date", today);
      }

      // Get yesterday's quest titles to avoid repeats
      const { data: yesterdayQuests } = await supabase
        .from("daily_quests")
        .select("title")
        .eq("user_id", profile.user_id)
        .eq("quest_date", yesterday);

      const yesterdayTitles = new Set((yesterdayQuests || []).map((q: any) => q.title));

      // Filter out yesterday's quests
      const availableQuests = QUEST_POOL.filter(q => !yesterdayTitles.has(q.title));

      // Use seeded random for this user+date combo (deterministic but unique per user per day)
      const rng = seededRandom(dateSeed(today, profile.user_id));

      // Group by type
      const byType = new Map<string, typeof QUEST_POOL>();
      for (const q of availableQuests) {
        if (!byType.has(q.quest_type)) byType.set(q.quest_type, []);
        byType.get(q.quest_type)!.push(q);
      }

      // Shuffle types with seeded random
      const types = [...byType.keys()].sort(() => rng() - 0.5);

      // Pick 3 quests from different types, adapting difficulty to level
      const selected: typeof QUEST_POOL[number][] = [];
      const usedTypes = new Set<string>();

      for (const t of types) {
        if (selected.length >= 3) break;
        if (usedTypes.has(t)) continue;
        usedTypes.add(t);

        const pool = byType.get(t)!;
        // Sort by target, pick easier quests for lower levels
        const sorted = [...pool].sort((a, b) => a.target - b.target);
        
        let pick: typeof pool[number];
        if (profile.level <= 2) {
          // Beginners: prefer easier quests (first half)
          const easyPool = sorted.slice(0, Math.ceil(sorted.length / 2));
          pick = easyPool[Math.floor(rng() * easyPool.length)];
        } else if (profile.level >= 5) {
          // Veterans: prefer harder quests (second half)
          const hardPool = sorted.slice(Math.floor(sorted.length / 2));
          pick = hardPool[Math.floor(rng() * hardPool.length)];
        } else {
          // Mid-level: any quest
          pick = sorted[Math.floor(rng() * sorted.length)];
        }

        selected.push(pick);
      }

      // Fill remaining slots if we don't have 3 yet
      if (selected.length < 3) {
        const remaining = availableQuests.filter(q => !selected.includes(q));
        const shuffled = remaining.sort(() => rng() - 0.5);
        for (const q of shuffled) {
          if (selected.length >= 3) break;
          selected.push(q);
        }
      }

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
