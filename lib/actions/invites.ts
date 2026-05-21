"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCaptain } from "@/lib/auth";
import { acceptInviteSchema, createInviteSchema, tokenSchema } from "@/lib/validation";
import { acceptInviteByToken, createInviteForCaptain, declineInviteByToken } from "@/lib/server/invites";

export async function createInvite(formData: FormData) {
  const captain = await requireCaptain();
  const parsed = createInviteSchema.safeParse({
    inviteeName: formData.get("inviteeName"),
    email: formData.get("email"),
    phone: formData.get("phone")
  });
  if (!parsed.success) redirect(`/dashboard?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid invite.")}`);
  try {
    await createInviteForCaptain(captain, parsed.data);
  } catch (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error instanceof Error ? error.message : "Invite failed.")}`);
  }
  redirect("/dashboard?message=Invite created. SMS was sent when Twilio is configured.");
}

export async function acceptInvite(formData: FormData) {
  const parsed = acceptInviteSchema.parse({
    token: formData.get("token"),
    preference: formData.get("preference"),
    consent: formData.get("consent")
  });
  const h = await headers();
  await acceptInviteByToken(parsed.token, parsed.preference, {
    ip: h.get("x-forwarded-for"),
    userAgent: h.get("user-agent")
  });
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
