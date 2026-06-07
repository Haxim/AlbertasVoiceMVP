alter table public.subscribers
add column if not exists captain_email_consent boolean default false not null;
