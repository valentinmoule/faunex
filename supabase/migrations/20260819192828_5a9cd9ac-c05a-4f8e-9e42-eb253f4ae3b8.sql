create or replace function public.premium_user_ids(p_user_ids uuid[])
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select u
  from unnest(p_user_ids) as u
  where public.is_premium(u)
$$;

grant execute on function public.premium_user_ids(uuid[]) to authenticated;