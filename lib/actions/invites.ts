"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCaptain } from "@/lib/auth";
import { acceptInviteSchema, createInviteSchema, resendInviteSchema, selfReferralInviteSchema, tokenSchema } from "@/lib/validation";
import {
  acceptInviteByToken,
  createInviteForCaptain,
  createSelfReferralInvite,
  declineInviteByToken,
  resendInviteEmailForCaptain
} from "@/lib/server/invites";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";

export async function createInvite(formData: FormData) {
  const captain = await requireCaptain();
  const h = await headers();
  const parsed = createInviteSchema.safeParse({
    inviteeName: formData.get("inviteeName"),
    email: formData.get("email"),
    nameUseConsent: formData.get("nameUseConsent")
  });
  if (!parsed.success) redirect(`/dashboard?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid invite.")}`);
  let message = "Invite created.";
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    const result = await createInviteForCaptain(captain, parsed.data);
    message = inviteDeliveryMessage(result.delivery);
  } catch (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : "Invite failed.")}`);
  }
  redirect(`/dashboard?message=${encodeURIComponent(message)}`);
}

export async function resendInviteEmail(formData: FormData) {
  const captain = await requireCaptain();
  const parsed = resendInviteSchema.safeParse({
    inviteId: formData.get("inviteId")
  });
  if (!parsed.success) redirect(`/dashboard?error=${encodeURIComponent("Invalid invite.")}`);
  try {
    await resendInviteEmailForCaptain(captain, parsed.data.inviteId);
  } catch (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : "Invite resend failed.")}`);
  }
  redirect(`/dashboard?message=${encodeURIComponent("Invite email resent.")}`);
}

export async function createSelfReferral(formData: FormData) {
  const parsed = selfReferralInviteSchema.safeParse({
    captainId: formData.get("captainId"),
    email: formData.get("email")
  });
  if (!parsed.success) {
    const captainId = String(formData.get("captainId") || "");
    redirect(`/url?captainid=${encodeURIComponent(captainId)}&error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid email.")}`);
  }

  const h = await headers();
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    await createSelfReferralInvite(parsed.data.captainId, parsed.data.email);
  } catch (error) {
    console.warn("Self-referral invite failed:", error);
    redirect(`/url?captainid=${parsed.data.captainId}&message=${encodeURIComponent(selfReferralConfirmationMessage())}`);
  }
  redirect(`/url?captainid=${parsed.data.captainId}&message=${encodeURIComponent(selfReferralConfirmationMessage())}`);
}

export async function acceptInvite(formData: FormData) {
  const parsed = acceptInviteSchema.parse({
    token: formData.get("token"),
    preference: formData.get("preference"),
    consent: formData.get("consent"),
    captainEmailConsent: formData.get("captainEmailConsent") === "yes"
  });
  const h = await headers();
  await acceptInviteByToken(
    parsed.token,
    {
      preference: parsed.preference,
      captainEmailConsent: parsed.captainEmailConsent
    },
    {
      ip: h.get("x-forwarded-for"),
      userAgent: h.get("user-agent")
    }
  );
  redirect("/invite/thanks");
}

function selfReferralConfirmationMessage() {
  return "If this email can receive an invitation, we'll send the next step shortly.";
}

export async function declineInvite(formData: FormData) {
  const parsed = tokenSchema.parse({ token: formData.get("token") });
  const h = await headers();
  await declineInviteByToken(parsed.token, {
    ip: h.get("x-forwarded-for"),
    userAgent: h.get("user-agent")
  });
  redirect("/invite/thanks?declined=1");
}

function inviteDeliveryMessage(delivery: { email: string; sms: string }) {
  const sent = [
    delivery.email === "sent" ? "email" : null,
    delivery.sms === "sent" ? "SMS" : null
  ].filter(Boolean);
  if (sent.length) return `Invite created and sent by ${sent.join(" and ")}.`;

  const skipped = [
    delivery.email === "skipped" ? "Resend email" : null,
    delivery.sms === "skipped" ? "Twilio SMS" : null
  ].filter(Boolean);
  if (skipped.length === 1) return `Invite created, but ${skipped[0]} delivery is not configured.`;
  if (skipped.length) return `Invite created, but ${skipped.join(" and ")} delivery are not configured.`;

  return "Invite created.";
}
