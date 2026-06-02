import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailBroadcastHtml, emailBroadcastText } from "@/lib/messaging";
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
    .select("id,name,email,preference,email_consent,unsubscribed_at,subscription_token,profiles:captain_id(name)")
    .eq("email_consent", true)
    .not("email", "is", null)
    .order("created_at", { ascending: true });
  if (error) {
    if (errorMessage(error).includes("subscription_token")) {
      throw new Error("Missing subscribers.subscription_token. Run supabase/migrations/202605290001_add_subscription_management_tokens.sql in Supabase.");
    }
    throw error;
  }

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
        text: emailBroadcastText(body, subscriber.subscription_token),
        html: emailBroadcastHtml(body, subscriber.subscription_token),
        fromName: senderNameForSubscriber(subscriber),
        fromEmailEnv: "BROADCAST_FROM_EMAIL"
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
        error: errorMessage(error)
      });
    }
  }

  const { error: updateError } = await service
    .from("broadcasts")
    .update({
      status: failed > 0 ? "FAILED" : "SENT",
      sent_at: new Date().toISOString()
    })
    .eq("id", broadcast.id);
  if (updateError) throw updateError;

  return { audienceCount: audience.length, failed };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function senderNameForSubscriber(subscriber: { profiles?: { name?: string | null } | Array<{ name?: string | null }> | null }) {
  const profile = Array.isArray(subscriber.profiles) ? subscriber.profiles[0] : subscriber.profiles;
  const captainName = profile?.name?.trim();
  return captainName ? `${captainName} on behalf of Alberta's Voice` : "Alberta's Voice";
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return "Unknown send error";
}
