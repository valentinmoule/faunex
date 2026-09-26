create function public.category_leaderboard_with_movement(
  p_category text,
  p_limit integer default 20,
  p_scope text default 'global',
  p_period text default 'week'
)
returns table(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean, rank_change bigint)
language sql stable security definer set search_path to 'public'
as $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only,
           coalesce(p_period, 'week') = 'all' as all_time
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start,
           now() - interval '24 hours' as previous_cutoff
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from public.explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), eligible as (
    select c.user_id, c.created_at
    from public.captures c, bounds b, me m
    where c.status = 'approved'
      and (m.all_time or (c.created_at >= b.week_start and c.created_at < b.week_start + interval '7 days'))
      and (
        p_category is null or p_category in ('all', '*')
        or lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc','c62717cb-255a-4491-a5a0-132880e703be']::uuid[])
      and (not m.follows_only or ((select ok from premium) and c.user_id in (select uid from allowed)))
  ), current_base as (
    select e.user_id, count(*) as cnt from eligible e group by e.user_id
  ), previous_base as (
    select e.user_id, count(*) as cnt from eligible e, bounds b
    where e.created_at < b.previous_cutoff group by e.user_id
  ), current_ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from current_base b
  ), previous_ranked as (
    select b.user_id, rank() over (order by b.cnt desc) as rnk from previous_base b
  )
  select current.rnk, current.user_id, p.display_name, p.username, p.avatar_url,
         current.cnt, current.user_id = auth.uid(),
         case when previous.rnk is null then null else previous.rnk - current.rnk end
  from current_ranked current
  join public.profiles p on p.user_id = current.user_id
  left join previous_ranked previous on previous.user_id = current.user_id
  order by current.rnk, coalesce(p.display_name, p.username, '')
  limit greatest(coalesce(p_limit, 20), 1);
$function$;

revoke all on function public.category_leaderboard_with_movement(text, integer, text, text) from public, anon;
grant execute on function public.category_leaderboard_with_movement(text, integer, text, text) to authenticated;
grant execute on function public.category_leaderboard_with_movement(text, integer, text, text) to service_role;

create function public.my_category_rank_with_movement(
  p_category text,
  p_scope text default 'global',
  p_period text default 'week'
)
returns table(rank bigint, captures bigint, total_players bigint, rank_change bigint)
language sql stable security definer set search_path to 'public'
as $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only,
           coalesce(p_period, 'week') = 'all' as all_time
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start,
           now() - interval '24 hours' as previous_cutoff
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from public.explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), eligible as (
    select c.user_id, c.created_at
    from public.captures c, bounds b, me m
    where c.status = 'approved'
      and (m.all_time or (c.created_at >= b.week_start and c.created_at < b.week_start + interval '7 days'))
      and (
        p_category is null or p_category in ('all', '*')
        or lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc','c62717cb-255a-4491-a5a0-132880e703be']::uuid[])
      and (not m.follows_only or ((select ok from premium) and c.user_id in (select uid from allowed)))
  ), current_base as (
    select e.user_id, count(*) as cnt from eligible e group by e.user_id
  ), previous_base as (
    select e.user_id, count(*) as cnt from eligible e, bounds b
    where e.created_at < b.previous_cutoff group by e.user_id
  ), current_ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from current_base b
  ), previous_ranked as (
    select b.user_id, rank() over (order by b.cnt desc) as rnk from previous_base b
  )
  select current.rnk, current.cnt, (select count(*) from current_ranked),
         case when previous.rnk is null then null else previous.rnk - current.rnk end
  from current_ranked current
  left join previous_ranked previous on previous.user_id = current.user_id
  where current.user_id = auth.uid();
$function$;

revoke all on function public.my_category_rank_with_movement(text, text, text) from public, anon;
grant execute on function public.my_category_rank_with_movement(text, text, text) to authenticated;
grant execute on function public.my_category_rank_with_movement(text, text, text) to service_role;