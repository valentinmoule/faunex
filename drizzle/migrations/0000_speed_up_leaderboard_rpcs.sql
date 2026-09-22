-- Index pour les classements : évite le parcours complet de captures.
create index if not exists captures_approved_created_at_idx
  on public.captures (created_at desc)
  where status = 'approved';

create index if not exists captures_approved_category_norm_idx
  on public.captures (lower(btrim(regexp_replace(coalesce(category, ''), '\s*\(monde\)$', '', 'i'))), created_at desc)
  where status = 'approved';

create index if not exists captures_approved_animal_name_lower_idx
  on public.captures (lower(animal_name), created_at desc)
  where status = 'approved';

create index if not exists animal_departments_code_name_lower_idx
  on public.animal_departments (department_code, lower(animal_name));

-- Comparaison sargable (lower(...) = lower(...)) au lieu de ilike,
-- et is_premium évalué une seule fois plutôt que par ligne.
create or replace function public.category_leaderboard(p_category text, p_limit integer default 20, p_scope text default 'global', p_period text default 'week')
returns table(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  with me as (
    select auth.uid() as uid,
           coalesce(p_scope, 'global') = 'follows' as follows_only,
           coalesce(p_period, 'week') = 'all' as all_time
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b, me m
    where c.status = 'approved'
      and (m.all_time or (c.created_at >= b.week_start and c.created_at < b.week_start + interval '7 days'))
      and (
        p_category is null or p_category in ('all', '*')
        or lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        not m.follows_only
        or ((select ok from premium) and c.user_id in (select uid from allowed))
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
$function$;

create or replace function public.my_category_rank(p_category text, p_scope text default 'global', p_period text default 'week')
returns table(rank bigint, captures bigint, total_players bigint)
language sql
stable security definer
set search_path to 'public'
as $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only,
           coalesce(p_period, 'week') = 'all' as all_time
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b, me m
    where c.status = 'approved'
      and (m.all_time or (c.created_at >= b.week_start and c.created_at < b.week_start + interval '7 days'))
      and (
        p_category is null or p_category in ('all', '*')
        or lower(btrim(regexp_replace(coalesce(c.category, ''), '\s*\(monde\)$', '', 'i'))) = lower(btrim(p_category))
      )
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
      and (
        not m.follows_only
        or ((select ok from premium) and c.user_id in (select uid from allowed))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.cnt, (select count(*) from ranked)
  from ranked r
  where r.user_id = auth.uid();
$function$;

create or replace function public.territory_leaderboard(p_department text, p_limit integer default 20, p_scope text default 'global')
returns table(rank bigint, user_id uuid, display_name text, username text, avatar_url text, captures bigint, is_me boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b, me m
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
        not m.follows_only
        or ((select ok from premium) and c.user_id in (select uid from allowed))
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
$function$;

create or replace function public.my_territory_rank(p_department text, p_scope text default 'global')
returns table(rank bigint, captures bigint, total_players bigint)
language sql
stable security definer
set search_path to 'public'
as $function$
  with me as (
    select coalesce(p_scope, 'global') = 'follows' as follows_only
  ), bounds as (
    select ((now() at time zone 'Europe/Paris')::date
            - (extract(dow from (now() at time zone 'Europe/Paris')::date))::int)::timestamp at time zone 'Europe/Paris' as week_start
  ), allowed as (
    select auth.uid() as uid
    union
    select f.following_id from explorer_follows f
    where f.follower_id = auth.uid() and f.status = 'accepted'
  ), premium as (
    select public.is_premium(auth.uid()) as ok
  ), base as (
    select c.user_id, count(*) as cnt
    from captures c, bounds b, me m
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
        not m.follows_only
        or ((select ok from premium) and c.user_id in (select uid from allowed))
      )
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select r.rnk, r.cnt, (select count(*) from ranked)
  from ranked r
  where r.user_id = auth.uid();
$function$;
