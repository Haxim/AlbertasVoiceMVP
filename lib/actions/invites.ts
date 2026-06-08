"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCaptain } from "@/lib/auth";
import { acceptInviteSchema, createInviteSchema, tokenSchema } from "@/lib/validation";
import { acceptInviteByToken, createInviteForCaptain, declineInviteByToken } from "@/lib/server/invites";
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
