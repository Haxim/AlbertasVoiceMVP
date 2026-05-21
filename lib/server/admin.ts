import { createServiceClient } from "@/lib/supabase/server";
import { filterSubscribersByPreference } from "@/lib/rules";
import type { PreferenceFilter } from "@/lib/types";

export async function previewAudienceCount(preference: PreferenceFilter) {
  const service = createServiceClient();
  let query = service.from("subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null);
  if (preference !== "ALL") query = query.eq("preference", preference);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function exportSubscribersCsv(preference: PreferenceFilter) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscribers")
    .select("name,email,phone,preference,consented_at,unsubscribed_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = filterSubscribersByPreference(data || [], preference);
  const header = ["name", "email", "phone", "preference", "consented_at"].join(",");
  const body = rows.map((row) => [row.name, row.email, row.phone, row.preference, row.consented_at].map(csvCell).join(","));
  return [header, ...body].join("\n");
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
