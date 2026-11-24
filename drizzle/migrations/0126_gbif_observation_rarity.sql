ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS gbif_observations bigint,
  ADD COLUMN IF NOT EXISTS gbif_observations_at timestamptz;

COMMENT ON COLUMN public.animals.gbif_observations IS
  'Nombre d''observations de terrain (GBIF HUMAN_OBSERVATION, PRESENT) ; NULL si le binôme n''est pas propre à cette fiche ou si l''espèce est domestique.';

-- Grande famille utilisée pour comparer les fréquences (les fiches « (monde) » rejoignent leur famille).
CREATE OR REPLACE FUNCTION public.rarity_pool_category(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT regexp_replace(coalesce(p_category, ''), '\s*\(monde\)\s*$', '')
$$;

CREATE INDEX IF NOT EXISTS animals_gbif_pool_idx
  ON public.animals (public.rarity_pool_category(category), gbif_observations)
  WHERE gbif_observations > 0;

/* Niveau de rareté d'observation : part des espèces de la même grande famille
 * plus observées que celle-ci. Plafonné à Épique : Mythique et Légendaire
 * restent réservés aux planchers UICN et aux fiches déjà classées ainsi. */
CREATE OR REPLACE FUNCTION public.rarity_tier_for_observations(p_category text, p_count bigint)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
  v_more bigint;
  f numeric;
BEGIN
  IF p_count IS NULL OR p_count <= 0 THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE gbif_observations > p_count)
    INTO v_total, v_more
  FROM public.animals
  WHERE public.rarity_pool_category(category) = public.rarity_pool_category(p_category)
    AND gbif_observations > 0;
  IF v_total < 30 THEN RETURN NULL; END IF;
  f := v_more::numeric / v_total;
  RETURN CASE
    WHEN f < 0.35 THEN 'common'
    WHEN f < 0.60 THEN 'uncommon'
    WHEN f < 0.78 THEN 'rare'
    WHEN f < 0.90 THEN 'very_rare'
    WHEN f < 0.97 THEN 'ultra_rare'
    ELSE 'illustration_rare'
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.rarity_tier_for_observations(text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rarity_tier_for_observations(text, bigint) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.rarity_rebalance_backup (
  animal_id uuid PRIMARY KEY,
  rarity text NOT NULL,
  observation_rarity text,
  saved_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rarity_rebalance_backup TO service_role;
ALTER TABLE public.rarity_rebalance_backup ENABLE ROW LEVEL SECURITY;