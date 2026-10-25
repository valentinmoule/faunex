import { supabase } from '@/integrations/supabase/client';
import { dataUrlToBytes } from '@/lib/imageProcessing';
import { publishCaptureImageUpdate } from '@/lib/captureImageUpdates';

/** Uploads a cropped photo for an owned capture and points the capture at it. Returns the new URL. */
export async function saveCroppedCaptureImage(captureId: string, dataUrl: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from('captures')
    .upload(path, new Blob([dataUrlToBytes(dataUrl) as BlobPart], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
  if (upErr) return null;
  const url = supabase.storage.from('captures').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase
    .from('captures')
    .update({ image_url: url, subject_bbox: null })
    .eq('id', captureId)
    .eq('user_id', user.id);
  if (error) return null;
  publishCaptureImageUpdate({ captureId, userId: user.id, imageUrl: url });
  return url;
}
