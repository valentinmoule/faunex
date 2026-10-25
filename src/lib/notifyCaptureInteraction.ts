import { supabase } from '@/integrations/supabase/client';

export function notifyCaptureInteraction(
  captureId: string,
  actorId: string,
  type: 'like' | 'comment',
  content?: string,
  commentId?: string
) {
  // Fire-and-forget
  supabase.functions
    .invoke('notify-capture-interaction', {
      body: { capture_id: captureId, actor_id: actorId, type, content, comment_id: commentId },
    })
    .catch((e) => console.warn('notify-capture-interaction failed', e));
}
