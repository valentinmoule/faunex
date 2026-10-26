// Génère le détourage IA (fond transparent) des animaux gagnants du concours
// « Capture de la semaine » pour l'édition collector. Idempotent : ne traite que
// les gagnants sans cutout_url, par petits lots.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 2;
const CUTOUT_PROMPT =
  "Cut out the animal perfectly from its background. Keep the animal's exact shape, colors, fur or feather details and proportions identical to the source photo. Full body visible, sharp clean edges, no shadow, no background elements.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!LOVABLE_API_KEY || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Gagnants sans détourage, avec la photo de leur capture.
  const { data: winners, error } = await supabase
    .from("photo_contest_winners")
    .select("capture_id")
    .is("cutout_url", null)
    .not("capture_id", "is", null)
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!winners?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ capture_id: string; ok: boolean; reason?: string }> = [];

  for (const winner of winners) {
    const captureId = winner.capture_id as string;
    try {
      const { data: capture } = await supabase
        .from("captures")
        .select("image_url")
        .eq("id", captureId)
        .single();
      if (!capture?.image_url) throw new Error("capture image not found");

      const imageRes = await fetch(capture.image_url);
      if (!imageRes.ok) throw new Error(`image fetch failed: ${imageRes.status}`);
      const imageBytes = await imageRes.arrayBuffer();

      const form = new FormData();
      form.append("model", "openai/gpt-image-2.5-sunburst");
      form.append("prompt", CUTOUT_PROMPT);
      form.append("background", "transparent");
      form.append("output_format", "png");
      form.append(
        "image",
        new File([imageBytes], "photo.jpg", { type: imageRes.headers.get("content-type") ?? "image/jpeg" }),
      );

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: form,
      });
      if (!aiRes.ok) {
        const text = await aiRes.text();
        // 402/403 : crédits ou politique workspace — on arrête le lot, réessai plus tard.
        if (aiRes.status === 402 || aiRes.status === 403) {
          results.push({ capture_id: captureId, ok: false, reason: `credits/policy ${aiRes.status}` });
          break;
        }
        throw new Error(`ai edit failed: ${aiRes.status} ${text.slice(0, 200)}`);
      }
      const aiJson = await aiRes.json();
      const b64 = aiJson?.data?.[0]?.b64_json;
      if (!b64) throw new Error("no image in ai response");

      const pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `contest-cutouts/${captureId}.png`;
      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(path, pngBytes, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);

      const { data: publicUrl } = supabase.storage.from("captures").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("photo_contest_winners")
        .update({ cutout_url: publicUrl.publicUrl })
        .eq("capture_id", captureId);
      if (updateError) throw new Error(`update failed: ${updateError.message}`);

      results.push({ capture_id: captureId, ok: true });
    } catch (e) {
      results.push({ capture_id: captureId, ok: false, reason: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
