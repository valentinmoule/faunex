create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text not null check (char_length(message) <= 2000),
  stack text check (char_length(stack) <= 8000),
  platform text check (char_length(platform) <= 40),
  user_agent text check (char_length(user_agent) <= 500),
  path text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;
grant insert on public.client_errors to anon, authenticated;
grant all on public.client_errors to service_role;
create policy "Anyone can report own crash" on public.client_errors for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy "Admins read crashes" on public.client_errors for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
grant select on public.client_errors to authenticated;
create index client_errors_created_idx on public.client_errors (created_at desc);