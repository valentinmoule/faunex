import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await service.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Non autorisé" }, 401);
    const { data: isAdmin } = await service.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    const { prompt } = await req.json();
    if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 1000) {
      return json({ error: "Description invalide" }, 400);
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Configuration IA manquante" }, 500);

    const fullPrompt = `Modern, vivid nature photograph for a collectible card booster pack cover, portrait 2:3, no text, no logo, no frame. Theme: ${prompt.trim()}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt: fullPrompt, size: "1024x1536" }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("image gen failed", res.status, text.slice(0, 500));
      const message = res.status === 402 ? "Crédits IA insuffisants" : res.status === 429 ? "Trop de demandes, réessaie dans un instant" : "La génération a échoué";
      return json({ error: message }, res.status);
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "Aucune image renvoyée" }, 502);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${user.id}/collections/${crypto.randomUUID()}.png`;
    const { error: upErr } = await service.storage.from("captures").upload(path, bytes, { contentType: "image/png" });
    if (upErr) return json({ error: "Enregistrement de l'image impossible" }, 500);
    const { data: pub } = service.storage.from("captures").getPublicUrl(path);
    return json({ url: pub.publicUrl });
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur inattendue" }, 500);
  }
});
