import { supabase } from '@/integrations/supabase/client';

export function notifyCaptureInteraction(
  captureId: string,
  actorId: string,
  type: 'like' | 'comment',
  commentId?: string
) {
  // Le texte et les destinataires sont relus côté serveur depuis l'interaction enregistrée.
  supabase.functions
    .invoke('notify-capture-interaction', {
      body: { capture_id: captureId, actor_id: actorId, type, comment_id: commentId },
    })
    .catch((e) => console.warn('notify-capture-interaction failed', e));
}
