import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { filterSubscribersByPreference } from "@/lib/rules";
import type { PreferenceFilter, Profile } from "@/lib/types";

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

export async function sendEmailBroadcast({
  admin,
  preference,
  subject,
  body
}: {
  admin: Profile;
  preference: PreferenceFilter;
  subject: string;
  body: string;
}) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscribers")
    .select("id,name,email,preference,email_consent,unsubscribed_at")
    .eq("email_consent", true)
    .not("email", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const audience = filterSubscribersByPreference(data || [], preference);
  const { data: broadcast, error: broadcastError } = await service
    .from("broadcasts")
    .insert({
      admin_id: admin.id,
      channel: "EMAIL",
      preference_filter: preference,
      subject,
      body,
      audience_count: audience.length,
      status: "DRAFT"
    })
    .select("id")
    .single();
  if (broadcastError) throw broadcastError;

  let failed = 0;
  for (const subscriber of audience) {
    try {
      const providerMessageId = await sendEmail({
        to: subscriber.email,
        subject,
        text: `${body}\n\nYou are receiving this because you opted in to Alberta's Voice email updates.`
      });
      await service.from("broadcast_deliveries").insert({
        broadcast_id: broadcast.id,
        subscriber_id: subscriber.id,
        channel: "EMAIL",
        provider_message_id: providerMessageId,
        status: "SENT"
      });
    } catch (error) {
      failed += 1;
      await service.from("broadcast_deliveries").insert({
        broadcast_id: broadcast.id,
        subscriber_id: subscriber.id,
        channel: "EMAIL",
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown send error"
      });
    }
  }

  await service
    .from("broadcasts")
    .update({
      status: failed > 0 ? "FAILED" : "SENT",
      sent_at: new Date().toISOString()
    })
    .eq("id", broadcast.id);

  return { audienceCount: audience.length, failed };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
