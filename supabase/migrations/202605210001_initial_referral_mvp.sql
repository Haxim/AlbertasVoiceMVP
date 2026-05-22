create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text check (role in ('CAPTAIN','ADMIN')) default 'CAPTAIN',
  created_at timestamptz default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid references public.profiles(id) on delete cascade,
  invitee_name text not null,
  invitee_email text,
  invitee_phone text,
  normalized_email text,
  normalized_phone text,
  token text unique not null,
  status text check (status in ('PENDING','ACCEPTED','DECLINED','EXPIRED','UNSUBSCRIBED')) default 'PENDING',
  created_at timestamptz default now(),
  accepted_at timestamptz,
  declined_at timestamptz
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.invites(id),
  captain_id uuid references public.profiles(id),
  name text not null,
  email text,
  phone text,
  normalized_email text,
  normalized_phone text,
  preference text check (preference in ('ALL_UPDATES','WEEKLY_DIGEST','VOTE_REMINDER_ONLY')),
  sms_consent boolean default false,
  email_consent boolean default false,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid,
  subscriber_id uuid,
  event_type text,
  channel text,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  normalized_email text,
  normalized_phone text,
  reason text,
  created_at timestamptz default now()
);

create table public.broadcasts (
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

create table public.broadcast_deliveries (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid references public.broadcasts(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id),
  channel text check (channel in ('EMAIL','SMS')) not null,
  provider_message_id text,
  status text check (status in ('SENT','FAILED','SKIPPED')) not null,
  error text,
  created_at timestamptz default now()
);

create unique index suppression_email_unique on public.suppression_list(normalized_email) where normalized_email is not null;
create unique index suppression_phone_unique on public.suppression_list(normalized_phone) where normalized_phone is not null;
create unique index active_subscriber_email_unique on public.subscribers(normalized_email) where normalized_email is not null and unsubscribed_at is null;
create unique index active_subscriber_phone_unique on public.subscribers(normalized_phone) where normalized_phone is not null and unsubscribed_at is null;
create unique index active_invite_email_unique on public.invites(normalized_email) where normalized_email is not null and status in ('PENDING','ACCEPTED');
create unique index active_invite_phone_unique on public.invites(normalized_phone) where normalized_phone is not null and status in ('PENDING','ACCEPTED');
create index invites_captain_created_idx on public.invites(captain_id, created_at desc);
create index subscribers_preference_idx on public.subscribers(preference) where unsubscribed_at is null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscribers_touch_updated_at
before update on public.subscribers
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'CAPTAIN'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.leaderboard_counts()
returns table(period text, captain_id uuid, captain_name text, count bigint)
language sql
security definer
set search_path = public
as $$
  (
    select 'all_time'::text as period, p.id as captain_id, coalesce(p.name, p.email, 'Captain') as captain_name, count(s.id) as count
    from public.profiles p
    join public.subscribers s on s.captain_id = p.id and s.unsubscribed_at is null
    group by p.id
    order by count(s.id) desc
    limit 10
  )
  union all
  (
    select 'last_7_days'::text as period, p.id as captain_id, coalesce(p.name, p.email, 'Captain') as captain_name, count(s.id) as count
    from public.profiles p
    join public.subscribers s on s.captain_id = p.id and s.unsubscribed_at is null and s.created_at >= now() - interval '7 days'
    group by p.id
    order by count(s.id) desc
    limit 10
  );
$$;

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.subscribers enable row level security;
alter table public.consent_events enable row level security;
alter table public.suppression_list enable row level security;
alter table public.broadcasts enable row level security;
alter table public.broadcast_deliveries enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own_name_or_admin" on public.profiles
for update using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "invites_select_own_or_admin" on public.invites
for select using (captain_id = auth.uid() or public.is_admin());

create policy "invites_insert_own_or_admin" on public.invites
for insert with check (captain_id = auth.uid() or public.is_admin());

create policy "invites_update_own_or_admin" on public.invites
for update using (captain_id = auth.uid() or public.is_admin())
with check (captain_id = auth.uid() or public.is_admin());

create policy "subscribers_select_inviting_captain_or_admin" on public.subscribers
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.invites i
    where i.id = subscribers.invite_id
      and i.captain_id = auth.uid()
  )
);

create policy "subscribers_admin_insert" on public.subscribers
for insert with check (public.is_admin());

create policy "subscribers_admin_update" on public.subscribers
for update using (public.is_admin()) with check (public.is_admin());

create policy "subscribers_admin_delete" on public.subscribers
for delete using (public.is_admin());

create policy "consent_events_select_inviting_captain_or_admin" on public.consent_events
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.invites i
    where i.id = consent_events.invite_id
      and i.captain_id = auth.uid()
  )
);

create policy "consent_events_admin_insert" on public.consent_events
for insert with check (public.is_admin());

create policy "consent_events_admin_update" on public.consent_events
for update using (public.is_admin()) with check (public.is_admin());

create policy "consent_events_admin_delete" on public.consent_events
for delete using (public.is_admin());

create policy "suppression_admin_select" on public.suppression_list
for select using (public.is_admin());

create policy "suppression_admin_all" on public.suppression_list
for all using (public.is_admin()) with check (public.is_admin());

create policy "broadcasts_admin_all" on public.broadcasts
for all using (public.is_admin()) with check (public.is_admin());

create policy "broadcast_deliveries_admin_all" on public.broadcast_deliveries
for all using (public.is_admin()) with check (public.is_admin());
