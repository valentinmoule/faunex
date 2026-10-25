import { supabase } from '@/integrations/supabase/client';
export async function requestCaptureCorrection(captureId: string, name: string, scientificName: string, note: string) {
  const { data, error } = await supabase.rpc('request_capture_correction', {
    p_capture: captureId, p_name: name.trim(), p_scientific: scientificName.trim() || undefined, p_note: note.trim() || undefined,
  });
  if (error) throw error;
  return (data as { success?: boolean; reason?: string; remaining?: number } | null) ?? { reason: 'submission_error' };
}
