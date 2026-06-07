alter table public.subscribers
add column if not exists captain_email_consent boolean default true not null;
