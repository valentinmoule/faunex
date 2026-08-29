create or replace function public.category_leaderboard(p_category text, p_limit integer default 20, p_scope text default 'global')
returns table(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
language sql stable security definer set search_path = public
as $$
  with bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), scope as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b
    where c.status = 'approved'
      and c.created_at >= b.week_start
      and c.created_at < b.week_start + interval '7 days'
      and (
        p_category is null or p_category in ('all', '*')
        or btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i')) ilike p_category
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        coalesce(p_scope, 'global') <> 'follows'
        or (public.is_premium(auth.uid()) and c.user_id in (select uid from scope))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.user_id, p.display_name, p.username, p.avatar_url, r.cnt, r.user_id = auth.uid()
  from ranked r
  join profiles p on p.user_id = r.user_id
  order by r.rnk, coalesce(p.display_name, p.username, '')
  limit greatest(coalesce(p_limit, 20), 1);
$$;

create or replace function public.my_category_rank(p_category text, p_scope text default 'global')
returns table(rank bigint, captures bigint, total_players bigint)
language sql stable security definer set search_path = public
as $$
  with bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), scope as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b
    where c.status = 'approved'
      and c.created_at >= b.week_start
      and c.created_at < b.week_start + interval '7 days'
      and (
        p_category is null or p_category in ('all', '*')
        or btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i')) ilike p_category
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        coalesce(p_scope, 'global') <> 'follows'
        or (public.is_premium(auth.uid()) and c.user_id in (select uid from scope))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.cnt, (select count(*) from ranked)
  from ranked r
  where r.user_id = auth.uid();
$$;

create or replace function public.territory_leaderboard(p_department text, p_limit integer default 20, p_scope text default 'global')
returns table(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
language sql stable security definer set search_path = public
as $$
  with bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), scope as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b
    where c.status = 'approved'
      and c.created_at >= b.week_start
      and c.created_at < b.week_start + interval '7 days'
      and exists (
        select 1 from animal_departments ad
        where ad.department_code = p_department
          and lower(ad.animal_name) = lower(c.animal_name)
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        coalesce(p_scope, 'global') <> 'follows'
        or (public.is_premium(auth.uid()) and c.user_id in (select uid from scope))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.user_id, p.display_name, p.username, p.avatar_url, r.cnt, r.user_id = auth.uid()
  from ranked r
  join profiles p on p.user_id = r.user_id
  order by r.rnk, coalesce(p.display_name, p.username, '')
  limit greatest(coalesce(p_limit, 20), 1);
$$;

create or replace function public.my_territory_rank(p_department text, p_scope text default 'global')
returns table(rank bigint, captures bigint, total_players bigint)
language sql stable security definer set search_path = public
as $$
  with bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), scope as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b
    where c.status = 'approved'
      and c.created_at >= b.week_start
      and c.created_at < b.week_start + interval '7 days'
      and exists (
        select 1 from animal_departments ad
        where ad.department_code = p_department
          and lower(ad.animal_name) = lower(c.animal_name)
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        coalesce(p_scope, 'global') <> 'follows'
        or (public.is_premium(auth.uid()) and c.user_id in (select uid from scope))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.cnt, (select count(*) from ranked)
  from ranked r
  where r.user_id = auth.uid();
$$;