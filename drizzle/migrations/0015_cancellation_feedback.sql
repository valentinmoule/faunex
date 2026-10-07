CREATE TABLE public.cancellation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cancellation_feedback TO authenticated;
GRANT ALL ON public.cancellation_feedback TO service_role;
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own feedback" ON public.cancellation_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND char_length(reason) <= 40 AND (comment IS NULL OR char_length(comment) <= 1000));
CREATE POLICY "Admins read feedback" ON public.cancellation_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));