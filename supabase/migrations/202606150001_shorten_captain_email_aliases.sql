update public.profiles
set captain_email_alias = 'cpt_' || encode(gen_random_bytes(4), 'hex')
where captain_email_alias is null
  or length(captain_email_alias) > 12;
