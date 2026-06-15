alter table public.profiles
add column if not exists captain_email_alias text;

update public.profiles
set captain_email_alias = 'cpt_' || encode(gen_random_bytes(4), 'hex')
where captain_email_alias is null;

create unique index if not exists profiles_captain_email_alias_unique
on public.profiles(captain_email_alias)
where captain_email_alias is not null;
