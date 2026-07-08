import crypto from "node:crypto";
import { getRuntimeAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/normalization";
import { runtimeEnv } from "@/lib/runtime-env";
import { createServiceClient } from "@/lib/supabase/server";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

type PublicSignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  origin?: string | null;
};

type SubscriberMatch = {
  id: string;
  invite_id: string | null;
  email_consent?: boolean | null;
  email_verified_at?: string | null;
  unsubscribed_at?: string | null;
};

type PendingSubscriber = {
  id: string;
  invite_id: string | null;
  normalized_email: string | null;
  email_verification_expires_at: string | null;
  unsubscribed_at?: string | null;
};

export async function startPublicUpdatesSignup(input: PublicSignupInput, requestMeta: RequestMeta = {}) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const normalizedEmail = normalizeEmail(email);
  if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
    throw new Error("Please provide your first and last name.");
  }
  if (email.length > 200 || !normalizedEmail) {
    throw new Error("Please provide a valid email address.");
  }

  const service = createServiceClient();
  const [{ data: suppressionMatches, error: suppressionError }, { data: subscribers, error: subscriberError }] =
    await Promise.all([
      service.from("suppression_list").select("id,reason").eq("normalized_email", normalizedEmail),
      service
        .from("subscribers")
        .select("id,invite_id,email_consent,email_verified_at,unsubscribed_at")
        .eq("normalized_email", normalizedEmail)
        .order("unsubscribed_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

  if (suppressionError) throw suppressionError;
  if (subscriberError) throw subscriberError;
  const hasBlockingSuppression = (suppressionMatches || []).some((row) => row.reason !== "EMAIL_UNSUBSCRIBE");
  if (hasBlockingSuppression) {
    throw new Error("This contact cannot be subscribed.");
  }

  const subscriber = ((subscribers || [])[0] || null) as SubscriberMatch | null;
  if (subscriber && !subscriber.unsubscribed_at && (subscriber.email_verified_at || subscriber.email_consent)) {
    return { alreadySubscribed: true };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const sentAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  const name = `${firstName} ${lastName}`.trim();
  const tokenHash = hashToken(token);

  let subscriberId = subscriber?.id;
  if (subscriberId) {
    const { error } = await service
      .from("subscribers")
      .update({
        name,
        email,
        preference: "ALL_UPDATES",
        email_consent: false,
        email_verified_at: null,
        email_verification_token_hash: tokenHash,
        email_verification_sent_at: sentAt,
        email_verification_expires_at: expiresAt,
        captain_email_consent: false,
        updated_at: sentAt
      })
      .eq("id", subscriberId);
    if (error) throw error;
  } else {
    const { data, error } = await service
      .from("subscribers")
      .insert({
        name,
        email,
        normalized_email: normalizedEmail,
        preference: "ALL_UPDATES",
        sms_consent: false,
        email_consent: false,
        captain_email_consent: false,
        consented_at: null,
        email_verification_token_hash: tokenHash,
        email_verification_sent_at: sentAt,
        email_verification_expires_at: expiresAt
      })
      .select("id")
      .single();
    if (error) throw error;
    subscriberId = data.id;
  }

  const verificationUrl = await publicUrl(`/api/verify-subscription?token=${encodeURIComponent(token)}`, input.origin);
  await sendVerificationEmail(email, firstName, verificationUrl, await publicUrl("/icon.png", input.origin));
  await service.from("consent_events").insert({
    subscriber_id: subscriberId,
    event_type: "EMAIL_VERIFICATION_SENT",
    channel: "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    metadata: { preference: "ALL_UPDATES", source: "home_page" }
  });

  return { alreadySubscribed: false };
}

export async function confirmPublicUpdatesSignup(token: string, requestMeta: RequestMeta = {}) {
  if (!token || token.length > 128) return "invalid" as const;

  const service = createServiceClient();
  const { data, error } = await service
    .from("subscribers")
    .select("id,invite_id,normalized_email,email_verification_expires_at,unsubscribed_at")
    .eq("email_verification_token_hash", hashToken(token))
    .is("email_verified_at", null)
    .limit(1)
    .maybeSingle();
  if (error || !data) return "invalid" as const;

  const subscriber = data as PendingSubscriber;
  if (!subscriber.email_verification_expires_at || new Date(subscriber.email_verification_expires_at).getTime() < Date.now()) {
    return "expired" as const;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await service
    .from("subscribers")
    .update({
      email_consent: true,
      consented_at: now,
      email_verified_at: now,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      unsubscribed_at: null,
      updated_at: now
    })
    .eq("id", subscriber.id);
  if (updateError) return "invalid" as const;

  if (subscriber.normalized_email) {
    await service.from("suppression_list").delete().eq("normalized_email", subscriber.normalized_email).eq("reason", "EMAIL_UNSUBSCRIBE");
  }

  await service.from("consent_events").insert({
    invite_id: subscriber.invite_id,
    subscriber_id: subscriber.id,
    event_type: subscriber.unsubscribed_at ? "EMAIL_REOPTED_IN" : "EMAIL_VERIFIED",
    channel: "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    metadata: { preference: "ALL_UPDATES", source: "home_page" }
  });

  return "confirmed" as const;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function publicUrl(path: string, origin?: string | null) {
  const base = origin || (await getRuntimeAppUrl());
  return `${base.replace(/\/$/, "")}${path}`;
}

async function sendVerificationEmail(recipient: string, firstName: string, verificationUrl: string, logoUrl: string) {
  await sendEmail({
    to: recipient,
    fromEmailEnv: (await runtimeEnv("BROADCAST_FROM_EMAIL")) ? "BROADCAST_FROM_EMAIL" : "INVITE_FROM_EMAIL",
    subject: "Confirm your Alberta's Voice updates signup",
    text: [
      `Hello ${firstName},`,
      "",
      "Please confirm that you want to receive Alberta's Voice email updates by opening this link:",
      verificationUrl,
      "",
      "This link expires in 24 hours. If you did not request these updates, you can ignore this email.",
      "",
      "Questions? Contact info@albertasvoice.ca."
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fa;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="background-color:#003754;padding:36px 32px;">
          <img src="${logoUrl}" width="128" height="128" alt="Alberta's Voice" style="display:block;width:128px;height:128px;margin:0 auto 18px auto;border:0;">
          <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.2;">Alberta's Voice</h1>
          <p style="margin:12px 0 0;color:#dbeafe;font-size:16px;">A Voice for Every Albertan</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Stay in the Loop</p>
          <h2 style="margin:0 0 20px;font-size:30px;line-height:1.2;color:#003754;font-weight:700;">Confirm your email address</h2>
          <p style="margin:0 0 20px;font-size:18px;line-height:1.6;">Thanks for signing up.</p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#374151;">Please confirm your email address to receive Alberta's Voice updates, event invitations, referendum explainers, and volunteer opportunities.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:40px auto;">
            <tr><td align="center" bgcolor="#c8102e" style="border-radius:8px;">
              <a href="${verificationUrl}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Confirm My Email Address</a>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6b7280;">This link expires in 24 hours.</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">If you did not sign up for Alberta's Voice, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:0 40px 40px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0;text-align:center;font-size:20px;font-weight:700;color:#003754;">No to the Nine. Stay in Canada.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
}
