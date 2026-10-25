import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function imageDigest(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function imageBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',')[1];
  if (!encoded || encoded.length > 8_000_000) throw new Error('INVALID_IMAGE');
  return Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
}

export async function issueAiProof(db: SupabaseClient, userId: string, body: Record<string, unknown>, hash: string) {
  const animal = body.animal as Record<string, unknown> | undefined;
  if (!body.success || typeof animal?.animal_name !== 'string') return body;
  const { data, error } = await db.from('capture_validations').insert({
    user_id: userId, image_hash: hash, animal_name: animal.animal_name,
    scientific_name: animal.scientific_name ?? null, source: 'ai',
  }).select('id').single();
  if (error) { console.error('Economy receipt unavailable', error.code); return body; }
  return { ...body, animal: { ...animal, economy_validation_id: data.id } };
}

export async function attestModeratedCapture(db: SupabaseClient, captureId: string, source: 'auto_moderation' | 'human_moderation') {
  const { data: capture, error } = await db.from('captures').select('id,user_id,image_url,animal_name,scientific_name,status').eq('id', captureId).single();
  if (error || !capture || capture.status !== 'approved') return;
  const base = Deno.env.get('SUPABASE_URL');
  if (!base || !capture.image_url.startsWith(`${base}/storage/v1/object/public/captures/${capture.user_id}/`)) return;
  const response = await fetch(capture.image_url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error('PHOTO_UNAVAILABLE');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 6_000_000) throw new Error('PHOTO_TOO_LARGE');
  const hash = await imageDigest(bytes);
  const { data: proof, error: proofError } = await db.from('capture_validations').insert({
    user_id: capture.user_id, capture_id: capture.id, image_url: capture.image_url,
    image_hash: hash, animal_name: capture.animal_name, scientific_name: capture.scientific_name, source,
  }).select('id').single();
  if (proofError) throw proofError;
  const { error: updateError } = await db.from('captures').update({ economy_validation_id: proof.id }).eq('id', capture.id).eq('status', 'approved').eq('image_url', capture.image_url).eq('animal_name', capture.animal_name);
  if (updateError) throw updateError;
}