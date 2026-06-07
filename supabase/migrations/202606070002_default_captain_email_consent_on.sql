alter table public.subscribers
alter column captain_email_consent set default true;

update public.subscribers
set captain_email_consent = true
where captain_email_consent is false;
