create or replace function public.prevent_non_admin_profile_privileged_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.role is distinct from new.role then
      raise exception 'Only admins can change profile roles.';
    end if;

    if old.email is distinct from new.email then
      raise exception 'Only admins can change profile emails.';
    end if;

    if old.created_at is distinct from new.created_at then
      raise exception 'Only admins can change profile creation timestamps.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_profile_role_change on public.profiles;
drop trigger if exists prevent_non_admin_profile_privileged_change on public.profiles;

create trigger prevent_non_admin_profile_privileged_change
before update on public.profiles
for each row execute function public.prevent_non_admin_profile_privileged_change();
