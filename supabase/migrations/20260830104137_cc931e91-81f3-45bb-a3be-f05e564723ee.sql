create or replace function public.species_finder_counts()
returns table (animal_key text, finders bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lower(animal_name) as animal_key, count(distinct user_id)::bigint as finders
  from public.captures
  where status = 'approved'
  group by lower(animal_name)
$$;

grant execute on function public.species_finder_counts() to authenticated;
grant execute on function public.species_finder_counts() to service_role;