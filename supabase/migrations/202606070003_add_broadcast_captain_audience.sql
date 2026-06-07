alter table public.broadcasts
add column if not exists audience_type text
check (audience_type in ('SUBSCRIBERS','CAPTAINS'))
default 'SUBSCRIBERS'
not null;

alter table public.broadcast_deliveries
add column if not exists recipient_profile_id uuid references public.profiles(id);
