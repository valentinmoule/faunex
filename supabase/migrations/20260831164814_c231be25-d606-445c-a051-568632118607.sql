DROP TRIGGER IF EXISTS enforce_canonical_animal_name_trg ON public.animals;
CREATE TRIGGER enforce_canonical_animal_name_trg
BEFORE INSERT OR UPDATE OF name, scientific_name ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.enforce_canonical_animal_name();

CREATE OR REPLACE FUNCTION public.apply_hybrid_rarity(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_n integer;
BEGIN
  WITH cand AS (
    SELECT t.id, public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic) AS target
    FROM public.taxa t
    WHERE t.rarity <> public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic)
    LIMIT p_limit
  ), upd AS (
    UPDATE public.taxa t SET rarity = c.target, updated_at = now()
    FROM cand c WHERE c.id = t.id
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  v_count := v_count + v_n;

  WITH cand AS (
    SELECT a.id,
           public.hybrid_rarity(
             coalesce(a.observation_rarity, a.rarity),
             a.iucn_status,
             coalesce(tx.is_domestic, false)
           ) AS target
    FROM public.animals a
    LEFT JOIN public.taxa tx ON tx.id = a.taxon_id
    WHERE a.rarity <> public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, coalesce(tx.is_domestic, false))
    LIMIT p_limit
  ), upd AS (
    UPDATE public.animals a SET rarity = c.target
    FROM cand c WHERE c.id = a.id
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  v_count := v_count + v_n;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM anon;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_hybrid_rarity(integer) TO service_role;
DROP FUNCTION IF EXISTS public.apply_hybrid_rarity();