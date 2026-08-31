CREATE TABLE IF NOT EXISTS public.rarity_recompute_queue (
  kind text NOT NULL,
  row_id uuid NOT NULL,
  target text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, row_id)
);

GRANT ALL ON public.rarity_recompute_queue TO service_role;
ALTER TABLE public.rarity_recompute_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view rarity queue"
  ON public.rarity_recompute_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enqueue_hybrid_rarity()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  DELETE FROM public.rarity_recompute_queue;

  INSERT INTO public.rarity_recompute_queue (kind, row_id, target)
  SELECT 'taxa', t.id, public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic)
  FROM public.taxa t
  WHERE t.rarity <> public.hybrid_rarity(coalesce(t.observation_rarity, t.rarity), t.iucn_status, t.is_domestic);

  INSERT INTO public.rarity_recompute_queue (kind, row_id, target)
  SELECT 'animals', a.id,
         public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, coalesce(tx.is_domestic, false))
  FROM public.animals a
  LEFT JOIN public.taxa tx ON tx.id = a.taxon_id
  WHERE a.rarity <> public.hybrid_rarity(coalesce(a.observation_rarity, a.rarity), a.iucn_status, coalesce(tx.is_domestic, false));

  SELECT count(*) INTO v_n FROM public.rarity_recompute_queue;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_hybrid_rarity(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer := 0;
  v_m integer := 0;
BEGIN
  WITH q AS (
    SELECT * FROM public.rarity_recompute_queue WHERE kind = 'taxa' LIMIT p_limit
  ), upd AS (
    UPDATE public.taxa t SET rarity = q.target, updated_at = now()
    FROM q WHERE t.id = q.row_id RETURNING t.id
  ), del AS (
    DELETE FROM public.rarity_recompute_queue r USING q WHERE r.kind = q.kind AND r.row_id = q.row_id RETURNING 1
  )
  SELECT count(*) INTO v_n FROM del;

  IF v_n = 0 THEN
    WITH q AS (
      SELECT * FROM public.rarity_recompute_queue WHERE kind = 'animals' LIMIT p_limit
    ), upd AS (
      UPDATE public.animals a SET rarity = q.target
      FROM q WHERE a.id = q.row_id RETURNING a.id
    ), del AS (
      DELETE FROM public.rarity_recompute_queue r USING q WHERE r.kind = q.kind AND r.row_id = q.row_id RETURNING 1
    )
    SELECT count(*) INTO v_m FROM del;
  END IF;

  RETURN v_n + v_m;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM anon;
REVOKE ALL ON FUNCTION public.apply_hybrid_rarity(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_hybrid_rarity(integer) TO service_role;
REVOKE ALL ON FUNCTION public.enqueue_hybrid_rarity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_hybrid_rarity() FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_hybrid_rarity() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_hybrid_rarity() TO service_role;