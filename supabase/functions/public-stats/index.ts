import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Floors so the landing never looks empty even at zero data
const FLOORS = {
  totalUsers: 2000,
  totalCaptures: 15000,
  speciesCount: 2400,
};

// Marketing figures are always rounded UP to the next thousand (6 745 -> 7 000).
const roundUp1000 = (n: number) => Math.ceil(n / 1000) * 1000;

const roundStats = (s: { totalUsers: number; totalCaptures: number; speciesCount: number }) => ({
  totalUsers: roundUp1000(s.totalUsers),
  totalCaptures: roundUp1000(s.totalCaptures),
  speciesCount: roundUp1000(s.speciesCount),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [usersRes, capturesRes, taxaRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("captures").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase
        .from("taxa")
        .select("*", { count: "exact", head: true })
        .eq("collectible", true)
        .eq("status", "validated")
        .in("rank", ["species", "subspecies", "breed", "group"]),
    ]);

    const stats = roundStats({
      totalUsers: Math.max(usersRes.count ?? 0, FLOORS.totalUsers),
      totalCaptures: Math.max(capturesRes.count ?? 0, FLOORS.totalCaptures),
      speciesCount: Math.max(taxaRes.count ?? 0, FLOORS.speciesCount),
    });

    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("public-stats error:", e);
    return new Response(JSON.stringify(roundStats(FLOORS)), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
