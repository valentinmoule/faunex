
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications as actor" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
