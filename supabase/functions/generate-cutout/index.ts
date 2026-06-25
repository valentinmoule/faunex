// Generate a transparent PNG cutout of the main animal in a capture photo.
// Used to render the holographic shimmer BETWEEN the background and the animal,
// like a Pokémon holo card.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `Isole le sujet animal principal de cette photo et retourne UNIQUEMENT l'animal sur un FOND ENTIÈREMENT TRANSPARENT (alpha = 0).
Conserve fidèlement la pose, les détails du pelage/plumage/peau et les couleurs originales de l'animal.
Aucune ombre portée, aucun fond, aucun cadre, aucun texte. Sortie : PNG avec canal alpha, fond strictement transparent.`;

const MODEL = "google/gemini-3.1-flash-image";

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/jpeg";
  // Convert to base64 in chunks (avoid call-stack overflow on large images)
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

async function callCutoutModel(imageDataUrl: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from model");
  return b64;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { capture_id } = await req.json();
    if (!capture_id || typeof capture_id !== "string") {
      return new Response(JSON.stringify({ error: "capture_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: capture, error: capErr } = await admin
      .from("captures")
      .select("id, user_id, image_url, cutout_status, cutout_attempts")
      .eq("id", capture_id)
      .single();
    if (capErr || !capture) throw new Error("Capture not found");
    if (capture.cutout_status === "ready" && capture.cutout_attempts >= 1) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!capture.image_url) throw new Error("Capture has no image_url");

    await admin
      .from("captures")
      .update({ cutout_status: "processing", cutout_attempts: (capture.cutout_attempts || 0) + 1 })
      .eq("id", capture_id);

    const imageDataUrl = await fetchAsDataUrl(capture.image_url);

    // Try once, retry once on failure.
    let b64: string;
    try {
      b64 = await callCutoutModel(imageDataUrl, LOVABLE_KEY);
    } catch (e) {
      console.warn("cutout attempt 1 failed, retrying:", e);
      b64 = await callCutoutModel(imageDataUrl, LOVABLE_KEY);
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${capture.user_id}/cutouts/${capture_id}.png`;
    const { error: upErr } = await admin.storage
      .from("captures")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from("captures").getPublicUrl(path);
    const cutout_url = pub.publicUrl;

    await admin
      .from("captures")
      .update({ cutout_url, cutout_status: "ready" })
      .eq("id", capture_id);

    return new Response(JSON.stringify({ ok: true, cutout_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cutout error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.capture_id) {
        await admin.from("captures").update({ cutout_status: "failed" }).eq("id", body.capture_id);
      }
    } catch (_) {}
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
