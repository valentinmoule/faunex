import { supabase } from '@/integrations/supabase/client';

export function notifyCaptureInteraction(
  captureId: string,
  actorId: string,
  type: 'like' | 'comment',
  content?: string
) {
  // Fire-and-forget
  supabase.functions
    .invoke('notify-capture-interaction', {
      body: { capture_id: captureId, actor_id: actorId, type, content },
    })
    .catch((e) => console.warn('notify-capture-interaction failed', e));
}
