import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail, normalizePhone } from "@/lib/normalization";
import { hasDuplicateActiveContact, isSuppressed } from "@/lib/rules";
import { emailInviteSubject, emailInviteText, smsInviteText, sendSmsInvite } from "@/lib/messaging";
import { sendEmail } from "@/lib/email";
import type { Preference, Profile } from "@/lib/types";

export type InviteDeliveryStatus = "sent" | "skipped" | "none";

export async function createInviteForCaptain(
  captain: Profile,
  input: { inviteeName: string; email?: string; phone?: string }
) {
  const service = createServiceClient();
  const normalized_email = normalizeEmail(input.email);
  const normalized_phone = normalizePhone(input.phone);
  if (!normalized_email && !normalized_phone) throw new Error("Add a valid phone number or email.");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await service
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("captain_id", captain.id)
    .gte("created_at", oneHourAgo);
  if ((recentCount || 0) >= 25) throw new Error("Invite rate limit reached. Try again later.");

  const [inviteMatches, subscriberMatches, suppressionMatches] = await Promise.all([
    findContactRows("invites", normalized_email, normalized_phone),
    findContactRows("subscribers", normalized_email, normalized_phone),
    findContactRows("suppression_list", normalized_email, normalized_phone)
  ]);

  if (isSuppressed({ normalized_email, normalized_phone }, suppressionMatches)) {
    throw new Error("This contact cannot be invited.");
  }
  if (hasDuplicateActiveContact({ normalized_email, normalized_phone }, inviteMatches, subscriberMatches)) {
    throw new Error("An active invite or subscriber already exists for this contact.");
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const { data, error } = await service
    .from("invites")
    .insert({
      captain_id: captain.id,
      invitee_name: input.inviteeName,
      invitee_email: input.email || null,
      invitee_phone: input.phone || null,
      normalized_email,
      normalized_phone,
      token
    })
    .select("*")
    .single();
  if (error) throw error;

  const captainName = captain.name || "A local captain";
  const delivery: { email: InviteDeliveryStatus; sms: InviteDeliveryStatus } = {
    email: normalized_email ? "skipped" : "none",
    sms: normalized_phone ? "skipped" : "none"
  };

  await logConsentEvent({
    invite_id: data.id,
    event_type: "INVITE_SENT",
    channel: normalized_phone ? "SMS" : "EMAIL",
    metadata: { captain_id: captain.id }
  });

  if (normalized_phone) {
    const result = await sendSmsInvite(normalized_phone, smsInviteText(captainName, data));
    delivery.sms = result && "skipped" in result ? "skipped" : "sent";
  }
  if (normalized_email) {
    if (process.env.RESEND_API_KEY && (process.env.INVITE_FROM_EMAIL || process.env.BROADCAST_FROM_EMAIL)) {
      await sendEmail({
        to: normalized_email,
        subject: emailInviteSubject(captainName),
        text: emailInviteText(captainName, data),
        fromName: `${captainName} on behalf of Alberta's Voice`
      });
      delivery.email = "sent";
    } else {
      console.warn("Resend env missing; invite created but email not sent.");
    }
  }
  return { invite: data, delivery };
}

export async function acceptInviteByToken(token: string, preference: Preference, requestMeta: RequestMeta = {}) {
  const service = createServiceClient();
  const { data: invite, error } = await service.from("invites").select("*").eq("token", token).single();
  if (error || !invite) throw new Error("Invite not found.");
  if (invite.status !== "PENDING") throw new Error("This invite is no longer pending.");

  const { data: subscriber, error: subscriberError } = await service
    .from("subscribers")
    .insert({
      invite_id: invite.id,
      captain_id: invite.captain_id,
      name: invite.invitee_name,
      email: invite.invitee_email,
      phone: invite.invitee_phone,
      normalized_email: invite.normalized_email,
      normalized_phone: invite.normalized_phone,
      preference,
      sms_consent: Boolean(invite.normalized_phone),
      email_consent: Boolean(invite.normalized_email),
      consented_at: new Date().toISOString()
    })
    .select("*")
    .single();
  if (subscriberError) throw subscriberError;

  await service.from("invites").update({ status: "ACCEPTED", accepted_at: new Date().toISOString() }).eq("id", invite.id);
  await logConsentEvent({
    invite_id: invite.id,
    subscriber_id: subscriber.id,
    event_type: "ACCEPTED",
    channel: invite.normalized_phone ? "SMS" : "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    metadata: { preference }
  });
}

export async function declineInviteByToken(token: string, requestMeta: RequestMeta = {}) {
  const service = createServiceClient();
  const { data: invite, error } = await service.from("invites").select("*").eq("token", token).single();
  if (error || !invite) throw new Error("Invite not found.");
  if (invite.status !== "PENDING") return;
  await service.from("invites").update({ status: "DECLINED", declined_at: new Date().toISOString() }).eq("id", invite.id);
  await logConsentEvent({
    invite_id: invite.id,
    event_type: "DECLINED",
    channel: invite.normalized_phone ? "SMS" : "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent
  });
}

export async function unsubscribePhone(normalizedPhone: string, reason = "SMS_STOP") {
  const service = createServiceClient();
  await service.from("suppression_list").upsert(
    {
      normalized_phone: normalizedPhone,
      reason
    },
    { onConflict: "normalized_phone" }
  );
  const now = new Date().toISOString();
  const { data: subscribers } = await service
    .from("subscribers")
    .update({ unsubscribed_at: now, updated_at: now })
    .eq("normalized_phone", normalizedPhone)
    .is("unsubscribed_at", null)
    .select("id, invite_id");
  await service.from("invites").update({ status: "UNSUBSCRIBED" }).eq("normalized_phone", normalizedPhone).eq("status", "ACCEPTED");
  for (const subscriber of subscribers || []) {
    await logConsentEvent({
      invite_id: subscriber.invite_id,
      subscriber_id: subscriber.id,
      event_type: "UNSUBSCRIBED",
      channel: "SMS",
      metadata: { reason }
    });
  }
}

type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

async function findContactRows(table: "invites" | "subscribers" | "suppression_list", email: string | null, phone: string | null) {
  const service = createServiceClient();
  let query = service.from(table).select("*");
  if (email && phone) query = query.or(`normalized_email.eq.${email},normalized_phone.eq.${phone}`);
  else if (email) query = query.eq("normalized_email", email);
  else if (phone) query = query.eq("normalized_phone", phone);
  else return [];
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function logConsentEvent(event: {
  invite_id?: string | null;
  subscriber_id?: string | null;
  event_type: string;
  channel?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceClient();
  await service.from("consent_events").insert(event);
}
