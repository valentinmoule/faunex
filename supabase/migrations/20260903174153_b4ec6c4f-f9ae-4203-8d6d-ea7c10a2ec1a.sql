CREATE OR REPLACE FUNCTION public.capture_milestones(capture_ids uuid[])
RETURNS TABLE(capture_id uuid, capture_rank integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH targets AS (
    SELECT id, user_id FROM public.captures WHERE id = ANY(capture_ids)
  ),
  ranked AS (
    SELECT c.id,
           ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.created_at ASC, c.id ASC)::int AS rn
    FROM public.captures c
    WHERE c.status = 'approved'
      AND c.user_id IN (SELECT user_id FROM targets)
  )
  SELECT r.id, r.rn FROM ranked r WHERE r.id IN (SELECT id FROM targets);
$$;

GRANT EXECUTE ON FUNCTION public.capture_milestones(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_milestones(uuid[]) TO service_role;