drop index if exists public.stripe_donors_email_currency_unique;

alter table public.stripe_donors
drop constraint if exists stripe_donors_email_currency_key;

create unique index if not exists stripe_donors_name_email_currency_unique
on public.stripe_donors(name, email, currency);
