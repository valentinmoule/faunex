/**
 * Statuts de conservation UICN + rareté « hybride ».
 *
 * Le statut UICN (via GBIF, checklist Liste rouge) sert de plancher de rareté :
 * une espèce menacée ne peut plus être « commune ». La difficulté d'observation
 * peut aller au-delà, et les espèces domestiques restent toujours communes.
 *
 * Réservé aux administrateurs. Appel par lots : { batch: 200 } jusqu'à
 * `remaining: 0`, puis { recompute: true } pour appliquer la rareté hybride.
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
const UA = "faunex-rarity/1.0 (https://faunex.fr)";

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

async function getJson(url: string, tries = 3): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const body = await res.json();
        // GBIF renvoie un tableau d'erreur en cas de rate-limit.
        if (body && !Array.isArray(body)) return body;
      }
    } catch (_) {
      /* réessai */
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

/** Résout le statut UICN mondial d'un nom scientifique via GBIF. */
async function iucnFor(scientificName: string): Promise<string | null> {
  const match = await getJson(
    `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`,
  );
  const key = match?.usageKey;
  if (!key) return null;
  const cat = await getJson(`https://api.gbif.org/v1/species/${key}/iucnRedListCategory`);
  const code = String(cat?.category ?? "").toUpperCase();
  if (VALID.includes(code)) return code;
  // Taxon reconnu mais absent de la Liste rouge : non évalué.
  return match?.matchType && match.matchType !== "NONE" ? "NE" : null;
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
    const batch = Math.min(Math.max(Number(body.batch) || 0, 0), 400);
    const recomputeOnly = body.recompute === true && batch === 0;

    let resolved = 0;
    let unresolved = 0;

    if (!recomputeOnly && batch > 0) {
      const { data: pending } = await supabase
        .from("animals")
        .select("scientific_name")
        .is("iucn_status", null)
        .not("scientific_name", "is", null)
        .limit(batch * 3);

      const names = [
        ...new Set(
          (pending ?? [])
            .map((r: any) => String(r.scientific_name || "").trim())
            .filter((n: string) => n.length > 2 && !n.includes("(")),
        ),
      ].slice(0, batch);

      // Concurrence volontairement faible : GBIF limite fortement les clients.
      const CONC = 5;
      for (let i = 0; i < names.length; i += CONC) {
        const slice = names.slice(i, i + CONC);
        await Promise.all(
          slice.map(async (sci) => {
            const status = await iucnFor(sci);
            if (!status) {
              unresolved++;
              return;
            }
            resolved++;
            await Promise.all([
              supabase
                .from("taxa")
                .update({ iucn_status: status, iucn_checked_at: new Date().toISOString() })
                .ilike("scientific_name", sci),
              supabase.from("animals").update({ iucn_status: status }).ilike("scientific_name", sci),
            ]);
          }),
        );
      }
    }

    let rarityChanges: number | null = null;
    if (body.recompute === true) {
      const { data, error } = await supabase.rpc("apply_hybrid_rarity");
      if (error) console.error("[iucn] recompute failed", error);
      else rarityChanges = typeof data === "number" ? data : 0;
    }

    const { count: remaining } = await supabase
      .from("animals")
      .select("id", { count: "exact", head: true })
      .is("iucn_status", null)
      .not("scientific_name", "is", null);

    return json({ resolved, unresolved, remaining: remaining ?? 0, rarityChanges });
  } catch (e) {
    console.error("[iucn] error", e);
    return json({ error: String(e) }, 500);
  }
});
