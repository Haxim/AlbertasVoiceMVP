drop policy if exists "subscribers_select_admin_or_referring_captain" on public.subscribers;
drop policy if exists "subscribers_admin_all" on public.subscribers;
drop policy if exists "consent_events_admin_select" on public.consent_events;
drop policy if exists "consent_events_admin_insert" on public.consent_events;

create policy "subscribers_select_inviting_captain_or_admin" on public.subscribers
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.invites i
    where i.id = subscribers.invite_id
      and i.captain_id = auth.uid()
  )
);

create policy "subscribers_admin_insert" on public.subscribers
for insert with check (public.is_admin());

create policy "subscribers_admin_update" on public.subscribers
for update using (public.is_admin()) with check (public.is_admin());

create policy "subscribers_admin_delete" on public.subscribers
for delete using (public.is_admin());

create policy "consent_events_select_inviting_captain_or_admin" on public.consent_events
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.invites i
    where i.id = consent_events.invite_id
      and i.captain_id = auth.uid()
  )
);

create policy "consent_events_admin_insert" on public.consent_events
for insert with check (public.is_admin());

create policy "consent_events_admin_update" on public.consent_events
for update using (public.is_admin()) with check (public.is_admin());

create policy "consent_events_admin_delete" on public.consent_events
for delete using (public.is_admin());
