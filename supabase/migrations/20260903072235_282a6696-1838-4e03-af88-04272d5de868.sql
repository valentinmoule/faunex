create or replace function public.species_finder_count(_name text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(distinct user_id), 0)::int
  from public.captures
  where status = 'approved'
    and lower(animal_name) = lower(coalesce(_name, ''))
$$;

grant execute on function public.species_finder_count(text) to authenticated;
grant execute on function public.species_finder_count(text) to service_role;