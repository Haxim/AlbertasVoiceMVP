import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardInvite, Invite } from "@/lib/types";

export async function getCaptainDashboard(captainId: string) {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data: invites, error } = await supabase
    .from("invites")
    .select("*")
    .eq("captain_id", captainId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (invites || []) as Invite[];
  const latestEmailEvents = await getLatestEmailInviteEvents(rows);
  const dashboardInvites: DashboardInvite[] = rows.map((invite) => ({
    ...invite,
    last_email_invite_sent_at: latestEmailEvents.get(invite.id) || (invite.normalized_email ? invite.created_at : null)
  }));
  return {
    invites: dashboardInvites,
    referralCount: dashboardInvites.filter((invite) => invite.status === "ACCEPTED").length,
    pendingCount: dashboardInvites.filter((invite) => invite.status === "PENDING").length
  };
}

async function getLatestEmailInviteEvents(invites: Invite[]) {
  const inviteIds = invites.map((invite) => invite.id);
  const latestByInvite = new Map<string, string>();
  if (!inviteIds.length) return latestByInvite;

  const service = createServiceClient();
  const { data, error } = await service
    .from("consent_events")
    .select("invite_id, created_at")
    .in("invite_id", inviteIds)
    .eq("channel", "EMAIL")
    .in("event_type", ["INVITE_SENT", "INVITE_RESENT"])
    .order("created_at", { ascending: false });
  if (error) throw error;

  for (const event of data || []) {
    if (event.invite_id && !latestByInvite.has(event.invite_id)) {
      latestByInvite.set(event.invite_id, event.created_at);
    }
  }
  return latestByInvite;
}

export async function getInviteByToken(token: string) {
  noStore();
  const service = createServiceClient();
  const { data, error } = await service
    .from("invites")
    .select("*, profiles:captain_id(name)")
    .eq("token", token)
    .single();
  if (error) return null;
  return data;
}

export async function getAdminCounts() {
  noStore();
  const service = createServiceClient();
  const [captains, invites, subscribers, suppressed] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }).in("role", ["CAPTAIN", "THANK"]),
    service.from("invites").select("id", { count: "exact", head: true }),
    service.from("subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
    service.from("suppression_list").select("id", { count: "exact", head: true })
  ]);
  return {
    captains: captains.count || 0,
    invites: invites.count || 0,
    subscribers: subscribers.count || 0,
    suppressed: suppressed.count || 0
  };
}
