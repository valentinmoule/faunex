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
    WHEN f < 0.20 THEN 'common'
    WHEN f < 0.45 THEN 'uncommon'
    WHEN f < 0.70 THEN 'rare'
    WHEN f < 0.86 THEN 'very_rare'
    WHEN f < 0.96 THEN 'ultra_rare'
    ELSE 'illustration_rare'
  END;
END;
$$;