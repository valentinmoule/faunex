CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_events_created_at_idx ON public.login_events (created_at DESC);
CREATE INDEX login_events_user_id_created_at_idx ON public.login_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own login events"
  ON public.login_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all login events"
  ON public.login_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));