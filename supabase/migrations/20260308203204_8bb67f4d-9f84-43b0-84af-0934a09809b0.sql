
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  actor_id uuid NOT NULL,
  capture_id uuid REFERENCES public.captures(id) ON DELETE CASCADE,
  comment_text text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function for likes
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the capture owner and only notify if it's not the liker
  INSERT INTO public.notifications (user_id, type, actor_id, capture_id)
  SELECT c.user_id, 'like', NEW.user_id, NEW.capture_id
  FROM public.captures c
  WHERE c.id = NEW.capture_id
    AND c.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_like
  AFTER INSERT ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger function for comments
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, capture_id, comment_text)
  SELECT c.user_id, 'comment', NEW.user_id, NEW.capture_id, NEW.content
  FROM public.captures c
  WHERE c.id = NEW.capture_id
    AND c.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
