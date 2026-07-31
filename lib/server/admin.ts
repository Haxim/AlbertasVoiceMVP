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

export type CaptainSignupReportFilters = {
  startDate?: string;
  endDate?: string;
  minSignups: number;
};

export type CaptainSignupReportRow = {
  captainId: string;
  captainName: string;
  captainEmail: string;
  verifiedSignups: number;
  activeContacts: number;
  firstSignupAt: string;
  lastSignupAt: string;
};

type CaptainSignupSourceRow = {
  captain_id?: string | null;
  consented_at?: string | null;
  unsubscribed_at?: string | null;
  profiles?: { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null;
};

export async function previewAudienceCount(audience: BroadcastAudience, preference: PreferenceFilter) {
  const recipients = await getEmailAudience(audience, preference);
  return recipients.length;
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

export async function exportCaptainsCsv() {
  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("name,email,created_at")
    .in("role", ["CAPTAIN", "THANK"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const header = ["name", "email", "created_at"].join(",");
  const body = (data || []).map((row) => [row.name, row.email, row.created_at].map(csvCell).join(","));
  return [header, ...body].join("\n");
}

export async function getCaptainSignupReport(filters: CaptainSignupReportFilters) {
  const service = createServiceClient();
  let query = service
    .from("subscribers")
    .select("captain_id,consented_at,unsubscribed_at,profiles:captain_id(name,email)")
    .not("captain_id", "is", null)
    .not("consented_at", "is", null)
    .order("consented_at", { ascending: true });

  if (filters.startDate) query = query.gte("consented_at", startOfDate(filters.startDate));
  if (filters.endDate) query = query.lt("consented_at", dayAfter(filters.endDate));

  const { data, error } = await query;
  if (error) throw error;

  return buildCaptainSignupReportRows(data || [], filters.minSignups);
}

export function buildCaptainSignupReportRows(rows: CaptainSignupSourceRow[], minSignups: number) {
  const rowsByCaptain = new Map<string, CaptainSignupReportRow>();
  for (const subscriber of rows) {
    const captainId = String(subscriber.captain_id || "");
    if (!captainId || !subscriber.consented_at) continue;
    const profile = Array.isArray(subscriber.profiles) ? subscriber.profiles[0] : subscriber.profiles;
    const current = rowsByCaptain.get(captainId);
    if (current) {
      current.verifiedSignups += 1;
      if (!subscriber.unsubscribed_at) current.activeContacts += 1;
      current.firstSignupAt = current.firstSignupAt < subscriber.consented_at ? current.firstSignupAt : subscriber.consented_at;
      current.lastSignupAt = current.lastSignupAt > subscriber.consented_at ? current.lastSignupAt : subscriber.consented_at;
      continue;
    }
    rowsByCaptain.set(captainId, {
      captainId,
      captainName: profile?.name?.trim() || profile?.email?.trim() || "Captain",
      captainEmail: profile?.email?.trim() || "",
      verifiedSignups: 1,
      activeContacts: subscriber.unsubscribed_at ? 0 : 1,
      firstSignupAt: subscriber.consented_at,
      lastSignupAt: subscriber.consented_at
    });
  }

  return Array.from(rowsByCaptain.values())
    .filter((row) => row.verifiedSignups >= minSignups)
    .sort((a, b) => b.verifiedSignups - a.verifiedSignups || a.captainName.localeCompare(b.captainName));
}

export async function exportCaptainSignupReportCsv(filters: CaptainSignupReportFilters) {
  const rows = await getCaptainSignupReport(filters);
  const header = ["captain_name", "captain_email", "verified_signups", "active_contacts", "first_signup_at", "last_signup_at"].join(",");
  const body = rows.map((row) =>
    [row.captainName, row.captainEmail, row.verifiedSignups, row.activeContacts, row.firstSignupAt, row.lastSignupAt]
      .map(csvCell)
      .join(",")
  );
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

export async function processIncompleteEmailBroadcastBatches(limit = 3) {
  const service = createServiceClient();
  const batchLimit = Math.min(Math.max(limit, 1), 10);
  const { data: broadcasts, error } = await service
    .from("broadcasts")
    .select("id")
    .eq("channel", "EMAIL")
    .in("status", ["DRAFT", "FAILED"])
    .order("created_at", { ascending: true })
    .limit(batchLimit);
  if (error) throw error;

  const results = [];
  for (const broadcast of broadcasts || []) {
    results.push(await processEmailBroadcastBatch(broadcast.id));
  }
  return results;
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
    .in("role", ["CAPTAIN", "THANK"])
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

function startOfDate(date: string) {
  return `${date}T00:00:00.000Z`;
}

function dayAfter(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString();
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
