alter table public.subscribers
add column if not exists subscription_token text;

update public.subscribers
set subscription_token = encode(gen_random_bytes(24), 'hex')
where subscription_token is null;

alter table public.subscribers
alter column subscription_token set default encode(gen_random_bytes(24), 'hex');

alter table public.subscribers
alter column subscription_token set not null;

create unique index if not exists subscribers_subscription_token_unique
on public.subscribers(subscription_token);
