import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';

/**
 * Échange d'un identity token Apple (flow natif) contre une session Faunex.
 *
 * Pourquoi cette fonction : Apple signe le jeton avec une audience différente
 * selon la plateforme (App ID sur iOS natif, Service ID sur le web). Le
 * provider Apple du backend n'accepte qu'une seule audience, ce qui cassait
 * soit iOS soit le web. On vérifie donc ici la signature Apple nous-mêmes en
 * autorisant les deux audiences légitimes, puis on émet une session.
 */
const ALLOWED_AUDIENCES = new Set(['com.faunex.faunex', 'com.faunex.web']);
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let payload: { identity_token?: unknown; nonce?: unknown; full_name?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corps de requête invalide' }, 400);
  }

  const identityToken = typeof payload.identity_token === 'string' ? payload.identity_token : '';
  const nonce = typeof payload.nonce === 'string' ? payload.nonce : '';
  const fullName =
    typeof payload.full_name === 'string' ? payload.full_name.trim().slice(0, 120) : '';

  if (!identityToken || identityToken.split('.').length !== 3) {
    return json({ error: 'Jeton Apple manquant ou malformé' }, 400);
  }

  let claims: Record<string, unknown>;
  try {
    const verified = await jwtVerify(identityToken, APPLE_JWKS, { issuer: APPLE_ISSUER });
    claims = verified.payload as Record<string, unknown>;
  } catch (error) {
    console.error('APPLE_EXCHANGE: signature invalide', String(error));
    return json({ error: 'Jeton Apple invalide' }, 401);
  }

  const audience = claims.aud;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.some((a) => typeof a === 'string' && ALLOWED_AUDIENCES.has(a))) {
    console.error('APPLE_EXCHANGE: audience refusée', audiences);
    return json({ error: 'Jeton Apple émis pour une autre application' }, 401);
  }

  if (nonce) {
    const expected = await sha256Hex(nonce);
    const claimNonce = typeof claims.nonce === 'string' ? claims.nonce : '';
    if (claimNonce && claimNonce !== nonce && claimNonce !== expected) {
      console.error('APPLE_EXCHANGE: nonce non concordant');
      return json({ error: 'Jeton Apple invalide' }, 401);
    }
  }

  const appleSub = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  if (!appleSub || !email) {
    return json(
      { error: "Apple n'a pas fourni d'adresse e-mail. Autorise le partage de l'e-mail." },
      400,
    );
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Création du compte si nécessaire (idempotent : on ignore l'erreur "déjà pris").
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      provider_id: appleSub,
      apple_sub: appleSub,
      ...(fullName ? { display_name: fullName, full_name: fullName } : {}),
    },
  });

  if (createError && !/already|exists|registered/i.test(createError.message)) {
    console.error('APPLE_EXCHANGE: createUser a échoué', createError.message);
    return json({ error: 'Création du compte impossible' }, 500);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error('APPLE_EXCHANGE: generateLink a échoué', linkError?.message);
    return json({ error: 'Session impossible à créer' }, 500);
  }

  return json({ token_hash: link.properties.hashed_token, email });
});
