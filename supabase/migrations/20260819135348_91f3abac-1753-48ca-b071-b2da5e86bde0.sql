-- Journal de dataset : prédictions IA, corrections utilisateur, décisions de modération
CREATE TABLE public.ml_dataset_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capture_id uuid REFERENCES public.captures(id) ON DELETE SET NULL,
  user_id uuid,
  -- 'ai_prediction' | 'user_accepted' | 'user_correction' | 'user_dispute'
  -- | 'auto_moderation_approved' | 'auto_moderation_deferred'
  -- | 'moderation_approved' | 'moderation_rejected'
  event_type text NOT NULL,
  -- 'identify-animal' | 'enrich-capture' | 'auto-moderate-capture' | 'client' | 'moderation-ui'
  source text NOT NULL,
  model text,
  image_url text,
  image_hash text,
  -- prédiction IA
  predicted_name text,
  predicted_scientific_name text,
  predicted_category text,
  predicted_rarity text,
  confidence numeric,
  alternatives jsonb,
  subject_bbox jsonb,
  -- label retenu (correction utilisateur ou validation modération)
  label_name text,
  label_scientific_name text,
  label_category text,
  label_rarity text,
  -- contexte de terrain
  user_description text,
  location text,
  latitude double precision,
  longitude double precision,
  -- modération
  moderator_id uuid,
  decision_reason text,
  forced_name boolean NOT NULL DEFAULT false,
  -- vrai uniquement si le label a été validé (humain ou auto haute confiance)
  is_ground_truth boolean NOT NULL DEFAULT false,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ml_dataset_events TO authenticated;
GRANT ALL ON public.ml_dataset_events TO service_role;

ALTER TABLE public.ml_dataset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own dataset events"
ON public.ml_dataset_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own dataset events"
ON public.ml_dataset_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all dataset events"
ON public.ml_dataset_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ml_dataset_events_capture ON public.ml_dataset_events (capture_id);
CREATE INDEX idx_ml_dataset_events_type_created ON public.ml_dataset_events (event_type, created_at DESC);
CREATE INDEX idx_ml_dataset_events_ground_truth ON public.ml_dataset_events (is_ground_truth, created_at DESC);
CREATE INDEX idx_ml_dataset_events_hash ON public.ml_dataset_events (image_hash);

-- Vue d'export : uniquement les couples (image, label) validés
CREATE VIEW public.ml_dataset_ground_truth
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.capture_id,
  e.image_url,
  e.image_hash,
  COALESCE(e.label_name, e.predicted_name) AS label_name,
  COALESCE(e.label_scientific_name, e.predicted_scientific_name) AS label_scientific_name,
  COALESCE(e.label_category, e.predicted_category) AS label_category,
  COALESCE(e.label_rarity, e.predicted_rarity) AS label_rarity,
  e.subject_bbox,
  e.user_description,
  e.location,
  e.latitude,
  e.longitude,
  e.event_type,
  e.source,
  e.model,
  e.confidence,
  e.created_at
FROM public.ml_dataset_events e
WHERE e.is_ground_truth = true
  AND COALESCE(e.label_name, e.predicted_name) IS NOT NULL
  AND e.image_url IS NOT NULL;

GRANT SELECT ON public.ml_dataset_ground_truth TO authenticated;
GRANT ALL ON public.ml_dataset_ground_truth TO service_role;