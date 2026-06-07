import crypto from "node:crypto";
import { sendEmailBatch } from "@/lib/email";
import { emailCaptainMessageHtml, emailCaptainMessageText } from "@/lib/messaging";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const CAPTAIN_MESSAGE_BATCH_SIZE = 100;
const CAPTAIN_REPLY_DOMAIN = "join.albertasvoice.ca";

type CaptainSubscriber = {
  id: string;
  name: string | null;
  email: string;
  subscription_token: string;
};

export async function sendCaptainEmailMessage({
  captain,
  subject,
  body
}: {
  captain: Profile;
  subject: string;
  body: string;
}) {
  const audience = await getCaptainEmailAudience(captain.id);
  const replyTo = await replyToAddressForCaptain(captain);
  const batch = audience.slice(0, CAPTAIN_MESSAGE_BATCH_SIZE);
  if (!batch.length) return { sent: 0, failed: 0, remaining: 0 };

  await sendEmailBatch({
    emails: batch.map((subscriber) => {
      const personalizedBody = personalizeCaptainMessageBody(body, subscriber, captain);
      const captainName = captainNameForProfile(captain);
      return {
        to: subscriber.email,
        subject,
        text: emailCaptainMessageText(personalizedBody, subscriber.subscription_token, captainName),
        html: emailCaptainMessageHtml(personalizedBody, subscriber.subscription_token, captainName),
        fromName: `${captainName} on behalf of Alberta's Voice`,
        replyTo
      };
    }),
    fromEmailEnv: "BROADCAST_FROM_EMAIL",
    idempotencyKey: captainMessageIdempotencyKey(captain.id, subject, body, batch)
  });
  return { sent: batch.length, failed: 0, remaining: audience.length - batch.length };
}

export async function replyToAddressForCaptain(captain: Profile) {
  const alias = await ensureCaptainEmailAlias(captain);
  return `updates+${alias}@${CAPTAIN_REPLY_DOMAIN}`;
}

async function ensureCaptainEmailAlias(captain: Profile) {
  if (captain.captain_email_alias) return captain.captain_email_alias;

  const service = createServiceClient();
  const { data: existing, error: selectError } = await service
    .from("profiles")
    .select("captain_email_alias")
    .eq("id", captain.id)
    .single();
  if (selectError) {
    if (errorMessage(selectError).includes("captain_email_alias")) {
      throw new Error("Missing profiles.captain_email_alias. Run supabase/migrations/202606070003_add_captain_email_aliases.sql in Supabase.");
    }
    throw selectError;
  }

  const existingAlias = existing?.captain_email_alias?.trim();
  if (existingAlias) return existingAlias;

  const alias = `cpt_${crypto.randomBytes(8).toString("hex")}`;
  const { error: updateError } = await service.from("profiles").update({ captain_email_alias: alias }).eq("id", captain.id);
  if (updateError) throw updateError;
  return alias;
}

async function getCaptainEmailAudience(captainId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscribers")
    .select("id,name,email,subscription_token")
    .eq("captain_id", captainId)
    .eq("email_consent", true)
    .eq("captain_email_consent", true)
    .is("unsubscribed_at", null)
    .not("email", "is", null)
    .order("created_at", { ascending: true });
  if (error) {
    if (errorMessage(error).includes("captain_email_consent")) {
      throw new Error("Missing subscribers.captain_email_consent. Run supabase/migrations/202606070001_add_captain_email_consent.sql in Supabase.");
    }
    throw error;
  }
  return (data || []).filter((subscriber): subscriber is CaptainSubscriber => Boolean(subscriber.email));
}

export function personalizeCaptainMessageBody(
  body: string,
  subscriber: { name?: string | null },
  captain: Pick<Profile, "name" | "email">
) {
  return body
    .replace(/\[captain\]/g, captainNameForProfile(captain))
    .replace(/\[name\]/g, subscriber.name?.trim() || "friend");
}

function captainNameForProfile(captain: Pick<Profile, "name" | "email">) {
  return captain.name?.trim() || captain.email?.trim() || "Alberta's Voice";
}

function captainMessageIdempotencyKey(captainId: string, subject: string, body: string, batch: Array<{ id: string }>) {
  const input = [captainId, subject, body, ...batch.map((subscriber) => subscriber.id)].join("\n");
  return `captain-message/${crypto.createHash("sha256").update(input).digest("hex")}`;
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
