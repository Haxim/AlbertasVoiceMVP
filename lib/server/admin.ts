import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailBatch } from "@/lib/email";
import { emailBroadcastHtml, emailBroadcastText, emailInternalBroadcastHtml, emailInternalBroadcastText } from "@/lib/messaging";
import { filterSubscribersByPreference } from "@/lib/rules";
import type { BroadcastAudience, PreferenceFilter, Profile } from "@/lib/types";

const EMAIL_BROADCAST_BATCH_SIZE = 100;

type SubscriberAudienceRow = {
  id: string;
  name?: string | null;
  email: string;
  preference: PreferenceFilter;
  subscription_token: string;
  profiles?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type CaptainAudienceRow = {
  id: string;
  name?: string | null;
  email: string;
};

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
  audience,
  preference,
  subject,
  body
}: {
  admin: Profile;
  audience: BroadcastAudience;
  preference: PreferenceFilter;
  subject: string;
  body: string;
}) {
  const service = createServiceClient();
  const recipients = await getEmailAudience(audience, preference);
  const { data: broadcast, error: broadcastError } = await service
    .from("broadcasts")
    .insert({
      admin_id: admin.id,
      channel: "EMAIL",
      audience_type: audience,
      preference_filter: preference,
      subject,
      body,
      audience_count: recipients.length,
      status: "DRAFT"
    })
    .select("id")
    .single();
  if (broadcastError) throw broadcastError;

  return processEmailBroadcastBatch(broadcast.id);
}

export async function resumeEmailBroadcast(broadcastId: string) {
  return processEmailBroadcastBatch(broadcastId);
}

export async function getIncompleteEmailBroadcasts() {
  const service = createServiceClient();
  const { data: broadcasts, error } = await service
    .from("broadcasts")
    .select("id,subject,preference_filter,audience_type,audience_count,status,created_at")
    .eq("channel", "EMAIL")
    .in("status", ["DRAFT", "FAILED"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;

  return Promise.all(
    (broadcasts || []).map(async (broadcast) => {
      const progress = await getEmailBroadcastProgress(broadcast.id, audienceTypeForBroadcast(broadcast), broadcast.preference_filter);
      return {
        ...broadcast,
        sentCount: progress.sentCount,
        remainingCount: progress.pending.length
      };
    })
  );
}

export async function exportPendingEmailBroadcastCsv(broadcastId: string) {
  const service = createServiceClient();
  const { data: broadcast, error } = await service
    .from("broadcasts")
    .select("preference_filter,audience_type")
    .eq("id", broadcastId)
    .eq("channel", "EMAIL")
    .single();
  if (error) throw error;

  const audienceType = audienceTypeForBroadcast(broadcast);
  const { pending: rows } = await getEmailBroadcastProgress(broadcastId, audienceType, broadcast.preference_filter);
  const header = audienceType === "CAPTAINS" ? ["name", "email"].join(",") : ["name", "email", "preference"].join(",");
  const body = rows.map((row) => {
    if (audienceType === "CAPTAINS") {
      const captain = row as CaptainAudienceRow;
      return [captain.name, captain.email].map(csvCell).join(",");
    }
    const subscriber = row as SubscriberAudienceRow;
    return [subscriber.name, subscriber.email, subscriber.preference].map(csvCell).join(",");
  });
  return [header, ...body].join("\n");
}

async function processEmailBroadcastBatch(broadcastId: string) {
  const service = createServiceClient();
  const { data: broadcast, error: broadcastError } = await service
    .from("broadcasts")
    .select("id,subject,body,preference_filter,audience_type")
    .eq("id", broadcastId)
    .eq("channel", "EMAIL")
    .single();
  if (broadcastError) throw broadcastError;

  const audienceType = audienceTypeForBroadcast(broadcast);
  const { pending } = await getEmailBroadcastProgress(broadcast.id, audienceType, broadcast.preference_filter);
  const batch = pending.slice(0, EMAIL_BROADCAST_BATCH_SIZE);
  let failed = 0;
  let sent = 0;
  if (batch.length) {
    try {
      const emails = await Promise.all(
        batch.map(async (recipient) => {
          if (audienceType === "CAPTAINS") {
            const captain = recipient as CaptainAudienceRow;
            const body = personalizeCaptainBroadcastBody(broadcast.body, captain);
            return {
              to: captain.email,
              subject: broadcast.subject,
              text: emailInternalBroadcastText(body),
              html: emailInternalBroadcastHtml(body),
              fromName: "Alberta's Voice"
            };
          }
          const subscriber = recipient as SubscriberAudienceRow;
          const body = personalizeBroadcastBody(broadcast.body, subscriber);
          return {
            to: subscriber.email,
            subject: broadcast.subject,
            text: await emailBroadcastText(body, subscriber.subscription_token),
            html: await emailBroadcastHtml(body, subscriber.subscription_token),
            fromName: senderNameForSubscriber(subscriber)
          };
        })
      );
      const providerMessageIds = await sendEmailBatch({
        emails,
        fromEmailEnv: "BROADCAST_FROM_EMAIL",
        idempotencyKey: emailBatchIdempotencyKey(broadcast.id, batch)
      });
      await service.from("broadcast_deliveries").insert(
        batch.map((subscriber, index) => ({
          broadcast_id: broadcast.id,
          subscriber_id: audienceType === "SUBSCRIBERS" ? subscriber.id : null,
          recipient_profile_id: audienceType === "CAPTAINS" ? subscriber.id : null,
          channel: "EMAIL",
          provider_message_id: providerMessageIds[index],
          status: "SENT"
        }))
      );
      sent = batch.length;
    } catch (error) {
      failed = batch.length;
      await service.from("broadcast_deliveries").insert(
        batch.map((subscriber) => ({
          broadcast_id: broadcast.id,
          subscriber_id: audienceType === "SUBSCRIBERS" ? subscriber.id : null,
          recipient_profile_id: audienceType === "CAPTAINS" ? subscriber.id : null,
          channel: "EMAIL",
          status: "FAILED",
          error: errorMessage(error)
        }))
      );
    }
  }

  const remaining = pending.length - sent;
  const { error: updateError } = await service
    .from("broadcasts")
    .update({
      status: remaining > 0 ? "DRAFT" : "SENT",
      sent_at: remaining > 0 ? null : new Date().toISOString()
    })
    .eq("id", broadcast.id);
  if (updateError) throw updateError;

  return { broadcastId: broadcast.id, sent, failed, remaining };
}

async function getEmailAudience(audience: BroadcastAudience, preference: PreferenceFilter) {
  if (audience === "CAPTAINS") return getCaptainEmailAudience();
  return getSubscriberEmailAudience(preference);
}

async function getSubscriberEmailAudience(preference: PreferenceFilter) {
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
  return filterSubscribersByPreference(data || [], preference)
    .filter((subscriber) => Boolean(subscriber.email))
    .map(
      (subscriber) =>
        ({
          ...subscriber,
          email: String(subscriber.email)
        }) as SubscriberAudienceRow
    );
}

async function getCaptainEmailAudience() {
  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("id,name,email")
    .eq("role", "CAPTAIN")
    .not("email", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || [])
    .filter((profile) => Boolean(profile.email))
    .map((profile) => ({
      id: String(profile.id),
      name: profile.name,
      email: String(profile.email)
    }));
}

async function getSentRecipientIds(broadcastId: string, audience: BroadcastAudience) {
  const service = createServiceClient();
  if (audience === "CAPTAINS") {
    const { data, error } = await service
      .from("broadcast_deliveries")
      .select("recipient_profile_id")
      .eq("broadcast_id", broadcastId)
      .eq("status", "SENT");
    if (error) throw error;
    return new Set((data || []).map((delivery) => delivery.recipient_profile_id).filter(Boolean));
  }

  const { data, error } = await service
    .from("broadcast_deliveries")
    .select("subscriber_id")
    .eq("broadcast_id", broadcastId)
    .eq("status", "SENT");
  if (error) throw error;
  return new Set((data || []).map((delivery) => delivery.subscriber_id).filter(Boolean));
}

async function getEmailBroadcastProgress(broadcastId: string, audience: BroadcastAudience, preference: PreferenceFilter) {
  const [recipients, sentRecipientIds] = await Promise.all([getEmailAudience(audience, preference), getSentRecipientIds(broadcastId, audience)]);
  return {
    pending: recipients.filter((recipient) => !sentRecipientIds.has(recipient.id)),
    sentCount: sentRecipientIds.size
  };
}

function emailBatchIdempotencyKey(broadcastId: string, batch: Array<{ id: string }>) {
  const subscriberHash = crypto.createHash("sha256").update(batch.map((subscriber) => subscriber.id).join(",")).digest("hex");
  return `broadcast/${broadcastId}/batch/${subscriberHash}`;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function senderNameForSubscriber(subscriber: { profiles?: { name?: string | null } | Array<{ name?: string | null }> | null }) {
  const captainName = captainNameForSubscriber(subscriber);
  return captainName !== "Alberta's Voice" ? `${captainName} on behalf of Alberta's Voice` : "Alberta's Voice";
}

export function personalizeBroadcastBody(
  body: string,
  subscriber: { name?: string | null; profiles?: { name?: string | null } | Array<{ name?: string | null }> | null }
) {
  return body
    .replace(/\[captain\]/g, captainNameForSubscriber(subscriber))
    .replace(/\[name\]/g, subscriberNameForSubscriber(subscriber));
}

export function personalizeCaptainBroadcastBody(body: string, captain: { name?: string | null; email?: string | null }) {
  const captainName = captain.name?.trim() || captain.email?.trim() || "Captain";
  return body.replace(/\[captain\]/g, captainName).replace(/\[name\]/g, captainName);
}

function captainNameForSubscriber(subscriber: { profiles?: { name?: string | null } | Array<{ name?: string | null }> | null }) {
  const profile = Array.isArray(subscriber.profiles) ? subscriber.profiles[0] : subscriber.profiles;
  const captainName = profile?.name?.trim();
  return captainName || "Alberta's Voice";
}

function subscriberNameForSubscriber(subscriber: { name?: string | null }) {
  return subscriber.name?.trim() || "friend";
}

function audienceTypeForBroadcast(broadcast: { audience_type?: string | null }) {
  return broadcast.audience_type === "CAPTAINS" ? "CAPTAINS" : "SUBSCRIBERS";
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
