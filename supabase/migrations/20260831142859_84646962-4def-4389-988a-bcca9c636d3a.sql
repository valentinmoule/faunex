ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS observation_rarity text;
ALTER TABLE public.taxa ADD COLUMN IF NOT EXISTS observation_rarity text;

ALTER TABLE public.animals DISABLE TRIGGER USER;
ALTER TABLE public.taxa DISABLE TRIGGER USER;

UPDATE public.animals SET observation_rarity = rarity WHERE observation_rarity IS NULL;
UPDATE public.taxa SET observation_rarity = rarity WHERE observation_rarity IS NULL;

ALTER TABLE public.animals ENABLE TRIGGER USER;
ALTER TABLE public.taxa ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.apply_hybrid_rarity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_n integer;
BEGIN
  WITH upd AS (
    UPDATE public.taxa t
    SET rarity = public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic),
        updated_at = now()
    WHERE rarity <> public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic)
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;
  v_count := v_count + v_n;

  WITH upd2 AS (
    UPDATE public.animals a
    SET rarity = public.hybrid_rarity(
          coalesce(a.observation_rarity, a.rarity),
          a.iucn_status,
          coalesce(tx.is_domestic, false)
        )
    FROM public.taxa tx
    WHERE tx.id = a.taxon_id
      AND a.rarity <> public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, coalesce(tx.is_domestic, false))
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd2;
  v_count := v_count + v_n;

  WITH upd3 AS (
    UPDATE public.animals a
    SET rarity = public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, false)
    WHERE a.taxon_id IS NULL
      AND a.rarity <> public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, false)
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd3;
  v_count := v_count + v_n;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_hybrid_rarity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity() FROM anon;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_hybrid_rarity() TO service_role;