create table public.thank_you_emails (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id),
  recipient_email text not null,
  subject text not null,
  provider_message_id text,
  sent_at timestamptz not null default now()
);

create index thank_you_emails_sent_at_idx on public.thank_you_emails(sent_at desc);

alter table public.thank_you_emails enable row level security;

create or replace function public.can_send_thank_you()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN','THANK')
  );
$$;

create policy "thank_you_emails_thank_access_select" on public.thank_you_emails
for select using (public.can_send_thank_you());

create policy "thank_you_emails_thank_access_insert" on public.thank_you_emails
for insert with check (public.can_send_thank_you());
