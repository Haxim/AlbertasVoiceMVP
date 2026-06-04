create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

drop policy if exists "profiles_update_own_name_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_identity" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_update_own_identity" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin())
with check (public.is_admin());

create or replace function public.prevent_non_admin_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and auth.uid() is not null
    and not public.is_admin()
  then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_profile_role_change on public.profiles;

create trigger prevent_non_admin_profile_role_change
before update of role on public.profiles
for each row execute function public.prevent_non_admin_profile_role_change();
