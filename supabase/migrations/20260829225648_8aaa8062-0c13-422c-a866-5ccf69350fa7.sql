create or replace function public.my_species_progress()
returns table(species_count bigint, rank bigint, total_players bigint, top_percent integer)
language sql stable security definer set search_path = public
as $$
  with base as (
    select c.user_id, count(distinct lower(btrim(c.scientific_name))) as cnt
    from captures c
    where c.status = 'approved'
      and c.scientific_name is not null and btrim(c.scientific_name) <> ''
      and c.user_id <> all (array['f7910e92-39a6-4703-b31d-bf1e245e2a4e','ac0df155-7422-4073-bfc1-14e2a71960bc']::uuid[])
    group by c.user_id
  ), ranked as (
    select b.user_id, b.cnt, rank() over (order by b.cnt desc) as rnk from base b
  )
  select coalesce(r.cnt, 0), coalesce(r.rnk, 0), coalesce((select count(*) from ranked), 0),
         case when (select count(*) from ranked) = 0 or r.rnk is null then 100
              else greatest(1, ceil(r.rnk * 100.0 / (select count(*) from ranked))::int)
         end
  from (select 1) one
  left join ranked r on r.user_id = auth.uid();
$$;
grant execute on function public.my_species_progress() to authenticated;