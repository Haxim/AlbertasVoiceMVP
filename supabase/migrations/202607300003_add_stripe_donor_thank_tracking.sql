create table if not exists public.stripe_donors (
  id uuid primary key default gen_random_uuid(),
  donor_key text,
  stripe_customer_id text,
  name text,
  email text not null,
  currency text not null default 'cad',
  amount_cents integer not null default 0,
  charge_count integer not null default 0,
  last_donation_at timestamptz,
  thank_you_sent_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (donor_key, currency)
);

alter table public.stripe_donors
add column if not exists donor_key text;

alter table public.stripe_donors
add column if not exists stripe_customer_id text;

alter table public.stripe_donors
add column if not exists name text;

alter table public.stripe_donors
add column if not exists email text;

alter table public.stripe_donors
add column if not exists currency text not null default 'cad';

alter table public.stripe_donors
add column if not exists amount_cents integer not null default 0;

alter table public.stripe_donors
add column if not exists charge_count integer not null default 0;

alter table public.stripe_donors
add column if not exists last_donation_at timestamptz;

alter table public.stripe_donors
add column if not exists thank_you_sent_at timestamptz;

alter table public.stripe_donors
add column if not exists synced_at timestamptz not null default now();

alter table public.stripe_donors
add column if not exists created_at timestamptz not null default now();

alter table public.stripe_donors
add column if not exists updated_at timestamptz not null default now();

drop index if exists public.stripe_donors_email_currency_unique;
drop index if exists public.stripe_donors_name_email_currency_unique;

alter table public.stripe_donors
drop constraint if exists stripe_donors_email_currency_key;

alter table public.stripe_donors
drop constraint if exists stripe_donors_name_email_currency_key;

update public.stripe_donors
set donor_key = lower(regexp_replace(coalesce(name, '') || '|' || coalesce(email, ''), '\s+', ' ', 'g'))
where donor_key is null;

alter table public.stripe_donors
alter column donor_key set not null;

create unique index if not exists stripe_donors_donor_key_currency_unique on public.stripe_donors(donor_key, currency);
create index if not exists stripe_donors_amount_idx on public.stripe_donors(amount_cents desc);
create index if not exists stripe_donors_thank_you_sent_at_idx on public.stripe_donors(thank_you_sent_at desc);

alter table public.thank_you_emails
add column if not exists donor_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'thank_you_emails_donor_id_fkey'
      and conrelid = 'public.thank_you_emails'::regclass
  ) then
    alter table public.thank_you_emails
    add constraint thank_you_emails_donor_id_fkey
    foreign key (donor_id) references public.stripe_donors(id);
  end if;
end;
$$;

alter table public.stripe_donors enable row level security;

drop policy if exists "stripe_donors_thank_access_select" on public.stripe_donors;

create policy "stripe_donors_thank_access_select" on public.stripe_donors
for select using (public.can_send_thank_you());

drop policy if exists "stripe_donors_thank_access_insert" on public.stripe_donors;

create policy "stripe_donors_thank_access_insert" on public.stripe_donors
for insert with check (public.can_send_thank_you());

drop policy if exists "stripe_donors_thank_access_update" on public.stripe_donors;

create policy "stripe_donors_thank_access_update" on public.stripe_donors
for update using (public.can_send_thank_you()) with check (public.can_send_thank_you());
