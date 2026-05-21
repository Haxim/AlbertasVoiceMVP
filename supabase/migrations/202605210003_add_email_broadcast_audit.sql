create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  channel text check (channel in ('EMAIL','SMS')) not null,
  preference_filter text check (preference_filter in ('ALL','ALL_UPDATES','WEEKLY_DIGEST','VOTE_REMINDER_ONLY')) not null,
  subject text,
  body text not null,
  audience_count integer default 0,
  status text check (status in ('DRAFT','SENT','FAILED')) default 'DRAFT',
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.broadcast_deliveries (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid references public.broadcasts(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id),
  channel text check (channel in ('EMAIL','SMS')) not null,
  provider_message_id text,
  status text check (status in ('SENT','FAILED','SKIPPED')) not null,
  error text,
  created_at timestamptz default now()
);

alter table public.broadcasts enable row level security;
alter table public.broadcast_deliveries enable row level security;

create policy "broadcasts_admin_all" on public.broadcasts
for all using (public.is_admin()) with check (public.is_admin());

create policy "broadcast_deliveries_admin_all" on public.broadcast_deliveries
for all using (public.is_admin()) with check (public.is_admin());
