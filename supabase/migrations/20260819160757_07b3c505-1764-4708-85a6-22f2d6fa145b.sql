CREATE OR REPLACE FUNCTION public.category_leaderboard(p_category text, p_limit integer DEFAULT 20)
RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, species bigint, is_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT c.user_id, count(DISTINCT lower(c.animal_name)) AS cnt
    FROM captures c
    WHERE c.status = 'approved'
      AND btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i')) ILIKE p_category
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.user_id, p.display_name, p.username, p.avatar_url, r.cnt, r.user_id = auth.uid()
  FROM ranked r
  JOIN profiles p ON p.user_id = r.user_id
  ORDER BY r.rnk, coalesce(p.display_name, p.username, '')
  LIMIT greatest(coalesce(p_limit, 20), 1);
$$;

CREATE OR REPLACE FUNCTION public.my_category_rank(p_category text)
RETURNS TABLE(rank bigint, species bigint, total_players bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT c.user_id, count(DISTINCT lower(c.animal_name)) AS cnt
    FROM captures c
    WHERE c.status = 'approved'
      AND btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i')) ILIKE p_category
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.cnt, (SELECT count(*) FROM ranked)
  FROM ranked r
  WHERE r.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.category_leaderboard(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_category_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.category_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_category_rank(text) TO authenticated;