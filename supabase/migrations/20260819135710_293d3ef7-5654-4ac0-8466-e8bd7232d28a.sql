-- 1. Rattachement du journal au catalogue d'espèces existant (public.animals)
ALTER TABLE public.ml_dataset_events
  ADD COLUMN IF NOT EXISTS animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ml_dataset_events_animal ON public.ml_dataset_events (animal_id);

-- 2. Anti-duplication des reprises d'historique (une seule ligne de backfill par capture)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ml_dataset_events_backfill
  ON public.ml_dataset_events (capture_id)
  WHERE source = 'captures-backfill';

-- 3. Vue de consolidation : les captures validées EXISTANTES sont le socle du dataset
CREATE OR REPLACE VIEW public.ml_dataset_captures
WITH (security_invoker = true) AS
SELECT
  c.id AS capture_id,
  c.user_id,
  c.image_url,
  c.animal_name AS label_name,
  c.scientific_name AS label_scientific_name,
  c.category AS label_category,
  c.rarity AS label_rarity,
  c.subject_bbox,
  c.description AS user_description,
  c.note AS user_note,
  c.location,
  c.latitude,
  c.longitude,
  a.id AS animal_id,
  c.created_at,
  'confirmed'::text AS label_status
FROM public.captures c
LEFT JOIN public.animals a
  ON public.normalize_animal_label(a.name) = public.normalize_animal_label(c.animal_name)
WHERE c.status = 'approved'
  AND c.image_url IS NOT NULL
  AND c.animal_name IS NOT NULL
  AND c.animal_name <> ''
  AND lower(c.animal_name) <> 'inconnu';

GRANT SELECT ON public.ml_dataset_captures TO authenticated;
GRANT ALL ON public.ml_dataset_captures TO service_role;