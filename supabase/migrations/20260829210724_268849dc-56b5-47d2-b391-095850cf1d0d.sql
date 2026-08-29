CREATE OR REPLACE FUNCTION public.territory_leaderboard(p_department text, p_limit integer DEFAULT 20, p_scope text DEFAULT 'global'::text)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT (current_date - (extract(dow from current_date))::int)::timestamptz AS week_start
  ), scope AS (
    SELECT auth.uid() AS uid
    UNION
    SELECT f.following_id FROM explorer_follows f
    WHERE f.follower_id = auth.uid() AND f.status = 'accepted'
  ), base AS (
    SELECT c.user_id, count(*) AS cnt
    FROM captures c, bounds b
    WHERE c.status = 'approved'
      AND c.created_at >= b.week_start
      AND c.created_at < b.week_start + interval '7 days'
      AND EXISTS (
        SELECT 1 FROM animal_departments ad
        WHERE ad.department_code = p_department
          AND lower(ad.animal_name) = lower(c.animal_name)
      )
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      AND (coalesce(p_scope, 'global') <> 'follows' OR c.user_id IN (SELECT uid FROM scope))
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.user_id, p.display_name, p.username, p.avatar_url, r.cnt, r.user_id = auth.uid()
  FROM ranked r
  JOIN profiles p ON p.user_id = r.user_id
  ORDER BY r.rnk, coalesce(p.display_name, p.username, '')
  LIMIT greatest(coalesce(p_limit, 20), 1);
$function$;

CREATE OR REPLACE FUNCTION public.my_territory_rank(p_department text, p_scope text DEFAULT 'global'::text)
 RETURNS TABLE(rank bigint, captures bigint, total_players bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT (current_date - (extract(dow from current_date))::int)::timestamptz AS week_start
  ), scope AS (
    SELECT auth.uid() AS uid
    UNION
    SELECT f.following_id FROM explorer_follows f
    WHERE f.follower_id = auth.uid() AND f.status = 'accepted'
  ), base AS (
    SELECT c.user_id, count(*) AS cnt
    FROM captures c, bounds b
    WHERE c.status = 'approved'
      AND c.created_at >= b.week_start
      AND c.created_at < b.week_start + interval '7 days'
      AND EXISTS (
        SELECT 1 FROM animal_departments ad
        WHERE ad.department_code = p_department
          AND lower(ad.animal_name) = lower(c.animal_name)
      )
      AND c.user_id <> ALL (ARRAY['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      AND (coalesce(p_scope, 'global') <> 'follows' OR c.user_id IN (SELECT uid FROM scope))
    GROUP BY c.user_id
  ), ranked AS (
    SELECT b.user_id, b.cnt, rank() OVER (ORDER BY b.cnt DESC) AS rnk FROM base b
  )
  SELECT r.rnk, r.cnt, (SELECT count(*) FROM ranked)
  FROM ranked r
  WHERE r.user_id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.territory_leaderboard(text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_territory_rank(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.territory_leaderboard(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_territory_rank(text, text) TO authenticated;