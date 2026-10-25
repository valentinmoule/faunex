import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { imageBytes, imageDigest, attestModeratedCapture } from '../_shared/economyProof.ts';

const schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('ai'), captureId: z.string().uuid(), receiptId: z.string().uuid(), analyzedImage: z.string().max(8_000_000), crop: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative(), width: z.number().positive(), height: z.number().positive() }).optional() }),
  z.object({ mode: z.literal('moderation'), captureId: z.string().uuid() }),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!url || !key || !anon || !token) return json({ error: 'Unauthorized' }, 401);
    const { data: auth, error: authError } = await createClient(url, anon).auth.getUser(token);
    if (authError || !auth.user) return json({ error: 'Unauthorized' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid request' }, 400);
    const input = parsed.data;
    const db = createClient(url, key);
    if (input.mode === 'moderation') {
      const { data: admin } = await db.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
      if (admin !== true) return json({ error: 'Forbidden' }, 403);
      await attestModeratedCapture(db, input.captureId, 'human_moderation');
      return json({ success: true });
    }
    const { data: capture } = await db.from('captures').select('id,user_id,image_url,animal_name,scientific_name,status').eq('id', input.captureId).eq('user_id', auth.user.id).single();
    const { data: proof } = await db.from('capture_validations').select('*').eq('id', input.receiptId).eq('user_id', auth.user.id).single();
    if (!capture || !proof || proof.source !== 'ai' || proof.revoked_at || proof.consumed_at || new Date(proof.expires_at).getTime() < Date.now() || capture.status !== 'approved') return json({ error: 'Invalid validation' }, 409);
    const originalBytes = imageBytes(input.analyzedImage);
    if (await imageDigest(originalBytes) !== proof.image_hash) return json({ error: 'Image mismatch' }, 400);
    if (!capture.image_url.startsWith(`${url}/storage/v1/object/public/captures/${auth.user.id}/`)) return json({ error: 'Invalid photo' }, 400);
    // Exact bytes when uncropped; crop verification is deliberately deferred rather than trusting client pixels.
    if (input.crop) return json({ success: true, deferred: 'crop_validation' });
    const res = await fetch(capture.image_url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return json({ error: 'Photo unavailable' }, 503);
    const savedBytes = new Uint8Array(await res.arrayBuffer());
    if (savedBytes.length > 6_000_000 || await imageDigest(savedBytes) !== proof.image_hash) return json({ error: 'Image mismatch' }, 400);
    const norm = (v: string | null) => (v ?? '').trim().toLowerCase();
    if (norm(capture.animal_name) !== norm(proof.animal_name) || norm(capture.scientific_name) !== norm(proof.scientific_name)) return json({ success: true, deferred: 'canonical_identity' });
    const { error: bindError } = await db.from('capture_validations').update({ image_url: capture.image_url, capture_id: capture.id }).eq('id', proof.id).is('consumed_at', null);
    if (bindError) throw bindError;
    const { error: updateError } = await db.from('captures').update({ economy_validation_id: proof.id }).eq('id', capture.id).eq('image_url', capture.image_url).eq('animal_name', capture.animal_name).eq('status', 'approved');
    if (updateError) throw updateError;
    const { data: gains } = await db.from('eclats_transactions').select('balance_delta').eq('user_id', auth.user.id).or(`operation_key.eq.capture:${capture.id},source_id.eq.${capture.id}`);
    return json({ success: true, amount: (gains ?? []).reduce((n, r) => n + Number(r.balance_delta), 0) });
  } catch (error) {
    console.error('Capture economy confirmation failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Confirmation unavailable' }, 503);
  }
});