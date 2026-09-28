drop function if exists public.species_finder_count(text);
create or replace function public.species_finder_count(_name text, _scientific text default null)
returns integer language sql stable security definer set search_path to 'public' as $$
  with by_name as (
    select count(distinct user_id)::int n from public.captures
    where status = 'approved' and lower(animal_name) = lower(coalesce(_name, ''))
  )
  select case
    when (select n from by_name) > 0 or coalesce(trim(_scientific), '') = '' then (select n from by_name)
    else (select count(distinct user_id)::int from public.captures
          where status = 'approved' and lower(scientific_name) = lower(trim(_scientific)))
  end
$$;
grant execute on function public.species_finder_count(text, text) to authenticated, anon;