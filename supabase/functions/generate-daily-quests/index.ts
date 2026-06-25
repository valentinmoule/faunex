import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Weekly quest templates pool — targets adapted to a 7-day cycle.
const QUEST_POOL = [
  // capture_count variants (over the week)
  { quest_type: "capture_count", title: "Démarrage de la semaine", description: "Fais 3 captures cette semaine", icon: "🌅", target: 3, xp_reward: 80 },
  { quest_type: "capture_count", title: "Chasseur de la semaine", description: "Capture 7 espèces cette semaine", icon: "📸", target: 7, xp_reward: 200 },
  { quest_type: "capture_count", title: "Marathon hebdo", description: "Capture 12 espèces cette semaine", icon: "🏃", target: 12, xp_reward: 350 },
  { quest_type: "capture_count", title: "Frénésie de captures", description: "Capture 10 espèces cette semaine", icon: "🔥", target: 10, xp_reward: 300 },
  { quest_type: "capture_count", title: "Champion hebdo", description: "Capture 15 espèces cette semaine", icon: "🏆", target: 15, xp_reward: 450 },

  // capture_different variants
  { quest_type: "capture_different", title: "Diversité", description: "Capture 4 espèces différentes cette semaine", icon: "🦎", target: 4, xp_reward: 200 },
  { quest_type: "capture_different", title: "Naturaliste curieux", description: "Capture 6 espèces différentes cette semaine", icon: "🔬", target: 6, xp_reward: 300 },
  { quest_type: "capture_different", title: "Collectionneur", description: "Capture 8 espèces différentes cette semaine", icon: "🗃️", target: 8, xp_reward: 400 },
  { quest_type: "capture_different", title: "Encyclopédiste", description: "Découvre 5 nouvelles espèces cette semaine", icon: "📖", target: 5, xp_reward: 250 },

  // capture_rarity variants
  { quest_type: "capture_rarity", title: "Trouvaille rare", description: "Capture 2 espèces rares ou mieux cette semaine", icon: "💎", target: 2, xp_reward: 250 },
  { quest_type: "capture_rarity", title: "Chasseur d'élite", description: "Capture 4 espèces rares ou mieux cette semaine", icon: "⚡", target: 4, xp_reward: 450 },
  { quest_type: "capture_rarity", title: "Chercheur de trésors", description: "Trouve 3 animaux rares cette semaine", icon: "🏅", target: 3, xp_reward: 350 },
  { quest_type: "capture_rarity", title: "Légende vivante", description: "Trouve 2 espèces épiques ou mythiques cette semaine", icon: "🌟", target: 2, xp_reward: 500 },

  // new_zone variants
  { quest_type: "new_zone", title: "Explorateur", description: "Explore 3 zones différentes cette semaine", icon: "🗺️", target: 3, xp_reward: 250 },
  { quest_type: "new_zone", title: "Globe-trotter", description: "Explore 5 zones différentes cette semaine", icon: "🌍", target: 5, xp_reward: 400 },
  { quest_type: "new_zone", title: "Aventurier", description: "Capture dans 2 nouveaux lieux cette semaine", icon: "🧭", target: 2, xp_reward: 180 },
  { quest_type: "new_zone", title: "Nomade", description: "Explore 7 zones différentes cette semaine", icon: "🏕️", target: 7, xp_reward: 550 },

  // share_app variants
  { quest_type: "share_app", title: "Ambassadeur", description: "Partage Faunex avec un ami", icon: "🔗", target: 1, xp_reward: 50 },
  { quest_type: "share_app", title: "Recruteur", description: "Invite un ami à rejoindre Faunex", icon: "📢", target: 1, xp_reward: 50 },
  { quest_type: "share_app", title: "Bouche-à-oreille", description: "Fais découvrir Faunex autour de toi", icon: "🗣️", target: 1, xp_reward: 50 },
];

// Seeded random to get consistent but weekly-varying results
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

// Returns YYYY-MM-DD of the Monday of the week containing `date` (UTC, ISO week)
function startOfWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const forbidden = await requireAdmin(req, supabase);
    if (forbidden) return forbidden;

    const now = new Date();
    const thisWeek = startOfWeek(now);
    const lastWeekDate = new Date(now);
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
    const lastWeek = startOfWeek(lastWeekDate);

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
      // Check if user already has quests this week
      const { count } = await supabase
        .from("daily_quests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .eq("quest_date", thisWeek);

      if (count && count >= 3) continue;

      // Delete partial set if any
      if (count && count > 0) {
        await supabase
          .from("daily_quests")
          .delete()
          .eq("user_id", profile.user_id)
          .eq("quest_date", thisWeek);
      }

      // Get last week's quest titles to avoid repeats
      const { data: lastWeekQuests } = await supabase
        .from("daily_quests")
        .select("title")
        .eq("user_id", profile.user_id)
        .eq("quest_date", lastWeek);

      const lastTitles = new Set((lastWeekQuests || []).map((q: any) => q.title));

      const availableQuests = QUEST_POOL.filter(q => !lastTitles.has(q.title));

      const rng = seededRandom(dateSeed(thisWeek, profile.user_id));

      // Group by type
      const byType = new Map<string, typeof QUEST_POOL>();
      for (const q of availableQuests) {
        if (!byType.has(q.quest_type)) byType.set(q.quest_type, []);
        byType.get(q.quest_type)!.push(q);
      }

      const types = [...byType.keys()].sort(() => rng() - 0.5);

      const selected: typeof QUEST_POOL[number][] = [];
      const usedTypes = new Set<string>();

      for (const t of types) {
        if (selected.length >= 3) break;
        if (usedTypes.has(t)) continue;
        usedTypes.add(t);

        const pool = byType.get(t)!;
        const sorted = [...pool].sort((a, b) => a.target - b.target);
        
        let pick: typeof pool[number];
        if (profile.level <= 2) {
          const easyPool = sorted.slice(0, Math.ceil(sorted.length / 2));
          pick = easyPool[Math.floor(rng() * easyPool.length)];
        } else if (profile.level >= 5) {
          const hardPool = sorted.slice(Math.floor(sorted.length / 2));
          pick = hardPool[Math.floor(rng() * hardPool.length)];
        } else {
          pick = sorted[Math.floor(rng() * sorted.length)];
        }

        selected.push(pick);
      }

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
        quest_date: thisWeek,
      }));

      const { error } = await supabase.from("daily_quests").insert(rows);
      if (!error) generated++;
    }

    return new Response(
      JSON.stringify({ success: true, generated, week: thisWeek }),
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
