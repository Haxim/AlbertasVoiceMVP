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

    if old.captain_email_alias is distinct from new.captain_email_alias then
      raise exception 'Only admins can change captain email aliases.';
    end if;
  end if;

  return new;
end;
$$;
