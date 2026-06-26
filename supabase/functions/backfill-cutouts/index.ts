// Backfill cutouts for captures that don't have one yet.
// Designed to be called repeatedly (e.g. by pg_cron). Each invocation processes
// a small batch in parallel so we don't hit the function timeout.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 8;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Pick captures that need a cutout. Skip ones we've already retried 3 times.
    const { data: pending, error } = await admin
      .from("captures")
      .select("id")
      .or("cutout_status.is.null,cutout_status.eq.pending,cutout_status.eq.failed")
      .lt("cutout_attempts", 3)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invoke generate-cutout in parallel for the batch.
    const results = await Promise.allSettled(
      pending.map((p) =>
        admin.functions.invoke("generate-cutout", { body: { capture_id: p.id } }),
      ),
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && !(r.value as { error?: unknown }).error,
    ).length;
    const failed = results.length - succeeded;

    // Remaining count for monitoring.
    const { count: remaining } = await admin
      .from("captures")
      .select("id", { count: "exact", head: true })
      .or("cutout_status.is.null,cutout_status.eq.pending,cutout_status.eq.failed")
      .lt("cutout_attempts", 3);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: pending.length,
        succeeded,
        failed,
        remaining: remaining ?? null,
        done: (remaining ?? 0) === 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("backfill-cutouts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
