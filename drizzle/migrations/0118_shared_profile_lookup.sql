CREATE OR REPLACE FUNCTION public.get_shared_profile(p_handle text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  level integer,
  total_captures integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH h AS (
    SELECT btrim(coalesce(p_handle, '')) AS raw
  ), k AS (
    SELECT raw,
           lower(CASE WHEN raw LIKE '@%' THEN raw ELSE '@' || raw END) AS handle
    FROM h
    WHERE length(raw) BETWEEN 1 AND 80
  )
  SELECT p.user_id, p.display_name, p.username, p.avatar_url,
         p.level::integer, p.total_captures::integer
  FROM public.profiles p, k
  WHERE lower(btrim(p.username)) = k.handle
     OR (k.raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND p.user_id = k.raw::uuid)
  ORDER BY (p.username = CASE WHEN k.raw LIKE '@%' THEN k.raw ELSE '@' || k.raw END) DESC,
           p.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_shared_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_profile(text) TO anon, authenticated, service_role;