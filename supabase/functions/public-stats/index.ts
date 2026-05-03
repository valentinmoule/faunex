import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Floors so the landing never looks empty even at zero data
const FLOORS = {
  totalUsers: 250,
  totalCaptures: 1200,
  totalSpecies: 180,
  totalRegions: 24,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [usersRes, capturesRes, speciesRes, regionsRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("captures").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("animals").select("*", { count: "exact", head: true }),
      supabase.from("captures").select("location").eq("status", "approved").not("location", "is", null),
    ]);

    const distinctRegions = new Set(
      (regionsRes.data || [])
        .map((r: { location: string | null }) => (r.location || "").trim().toLowerCase())
        .filter(Boolean)
    ).size;

    const stats = {
      totalUsers: Math.max(usersRes.count ?? 0, FLOORS.totalUsers),
      totalCaptures: Math.max(capturesRes.count ?? 0, FLOORS.totalCaptures),
      totalSpecies: Math.max(speciesRes.count ?? 0, FLOORS.totalSpecies),
      totalRegions: Math.max(distinctRegions, FLOORS.totalRegions),
    };

    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("public-stats error:", e);
    return new Response(JSON.stringify(FLOORS), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
