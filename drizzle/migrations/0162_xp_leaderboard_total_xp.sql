CREATE OR REPLACE FUNCTION public.profile_total_xp(p_level integer, p_xp integer)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT sum(public.xp_needed_for_level(l)) FROM generate_series(1, greatest(coalesce(p_level,1)-1,0)) l),0)::bigint + coalesce(p_xp,0)
$$;

CREATE OR REPLACE FUNCTION public.xp_leaderboard(p_limit integer DEFAULT 20, p_scope text DEFAULT 'global'::text, p_period text DEFAULT 'week'::text)
 RETURNS TABLE(rank bigint, user_id uuid, display_name text, username text, avatar_url text, xp bigint, is_me boolean, total_players bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only,
           coalesce(p_period, 'week') = 'all' as all_time,
           public.is_staff(auth.uid()) as staff,
           public.is_premium(auth.uid()) as premium
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from public.explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), base as (
    select p.user_id, p.display_name, p.username, p.avatar_url,
           (case when m.all_time then public.profile_total_xp(p.level, p.xp)
                 else coalesce((select sum(lm.points) from public.league_members lm
                                where lm.user_id = p.user_id
                                  and lm.week_start = (date_trunc('week', now() at time zone 'Europe/Paris'))::date), 0)
            end)::bigint as pts
    from public.profiles p, me m
    where p.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc','c62717cb-255a-4491-a5a0-132880e703be']::uuid[])
      and (p.is_private is not true or m.staff or p.user_id in (select uid from allowed where uid is not null))
      and (not m.follows_only or (m.premium and p.user_id in (select uid from allowed)))
  ), ranked as (
    select b.*, rank() over (order by b.pts desc) as rnk, count(*) over () as total from base b where b.pts > 0
  )
  select r.rnk, r.user_id, r.display_name, r.username, r.avatar_url, r.pts, r.user_id = auth.uid(), r.total
  from ranked r
  where r.rnk <= greatest(coalesce(p_limit, 20), 1) or r.user_id = auth.uid()
  order by r.rnk, coalesce(r.display_name, r.username, '');
$function$;