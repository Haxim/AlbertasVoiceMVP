import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { Invite } from "@/lib/types";

export async function getCaptainDashboard(captainId: string) {
  noStore();
  const supabase = createSupabaseServerClient();
  const { data: invites, error } = await supabase
    .from("invites")
    .select("*")
    .eq("captain_id", captainId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (invites || []) as Invite[];
  return {
    invites: rows,
    referralCount: rows.filter((invite) => invite.status === "ACCEPTED").length,
    pendingCount: rows.filter((invite) => invite.status === "PENDING").length
  };
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

export async function getLeaderboard() {
  noStore();
  const service = createServiceClient();
  const { data, error } = await service.rpc("leaderboard_counts");
  if (error) throw error;
  return {
    allTime: (data || []).filter((row: { period: string }) => row.period === "all_time"),
    last7Days: (data || []).filter((row: { period: string }) => row.period === "last_7_days")
  };
}

export async function getAdminCounts() {
  noStore();
  const service = createServiceClient();
  const [captains, invites, subscribers, suppressed] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CAPTAIN"),
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
