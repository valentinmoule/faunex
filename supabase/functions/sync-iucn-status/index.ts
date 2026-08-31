/**
 * Import des statuts de conservation UICN et recalcul de la rareté « hybride ».
 *
 * Réservé aux administrateurs. Le corps de la requête contient des couples
 * (nom scientifique, statut UICN) : le statut sert de plancher de rareté,
 * la difficulté d'observation peut aller au-delà, et les espèces domestiques
 * restent toujours communes.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VALID = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"];

async function requireAdmin(req: Request, admin: any): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
  const callerId = data?.claims?.sub;
  if (error || !callerId) return json({ error: "Unauthorized" }, 401);
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Forbidden" }, 403);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const forbidden = await requireAdmin(req, supabase);
  if (forbidden) return forbidden;

  try {
    const body = await req.json().catch(() => ({}));
    const items: { scientific_name: string; iucn_status: string }[] = Array.isArray(body.items)
      ? body.items
      : [];
    const recompute = body.recompute !== false;

    const clean = items
      .map((i) => ({
        sci: String(i.scientific_name || "").trim(),
        st: String(i.iucn_status || "").toUpperCase(),
      }))
      .filter((i) => i.sci && VALID.includes(i.st));

    let updatedTaxa = 0;
    let updatedAnimals = 0;

    for (const { sci, st } of clean) {
      const [t, a] = await Promise.all([
        supabase
          .from("taxa")
          .update({ iucn_status: st, iucn_checked_at: new Date().toISOString() })
          .ilike("scientific_name", sci)
          .select("id"),
        supabase.from("animals").update({ iucn_status: st }).ilike("scientific_name", sci).select("id"),
      ]);
      updatedTaxa += t.data?.length ?? 0;
      updatedAnimals += a.data?.length ?? 0;
    }

    let rarityChanges = 0;
    if (recompute) {
      const { data, error } = await supabase.rpc("apply_hybrid_rarity");
      if (error) console.error("[iucn] recompute failed", error);
      rarityChanges = typeof data === "number" ? data : 0;
    }

    return json({ received: items.length, applied: clean.length, updatedTaxa, updatedAnimals, rarityChanges });
  } catch (e) {
    console.error("[iucn] error", e);
    return json({ error: String(e) }, 500);
  }
});
