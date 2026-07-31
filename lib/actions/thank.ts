"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireThankAccess } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { emailThankYouHtml, emailThankYouText } from "@/lib/messaging";
import { logThankYouEmailSent, syncStripeDonorsOverThreshold } from "@/lib/server/thank";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";
import { thankYouEmailSchema } from "@/lib/validation";

export async function sendThankYouEmail(formData: FormData) {
  const sender = await requireThankAccess();
  const h = await headers();
  const parsed = thankYouEmailSchema.safeParse({
    to: formData.get("to"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    donorId: formData.get("donorId"),
    confirmConsent: formData.get("confirmConsent")
  });
  if (!parsed.success) {
    redirect(`/thank?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid thank-you email.")}` as Route);
  }

  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    const providerMessageId = await sendEmail({
      to: parsed.data.to,
      subject: parsed.data.subject,
      text: emailThankYouText(parsed.data.body),
      html: emailThankYouHtml(parsed.data.body),
      fromName: "Alberta's Voice",
      fromEmailEnv: "THANK_FROM_EMAIL",
      replyTo: sender.email || undefined
    });
    await logThankYouEmailSent({
      sender,
      recipientEmail: parsed.data.to,
      subject: parsed.data.subject,
      providerMessageId,
      donorId: parsed.data.donorId || null
    });
  } catch (error) {
    redirect(`/thank?error=${encodeURIComponent(errorMessage(error, "Thank-you email failed."))}` as Route);
  }

  redirect(`/thank?message=${encodeURIComponent(`Thank-you email sent to ${parsed.data.to}.`)}` as Route);
}

export async function syncStripeDonors() {
  await requireThankAccess();
  let message = "Stripe sync complete.";
  try {
    const result = await syncStripeDonorsOverThreshold();
    message = `Stripe sync complete: ${result.synced} donors at $250+ from ${result.scanned} charges. ${result.grouped} grouped donors, ${result.belowThreshold} below $250, ${result.skippedMissingIdentity} skipped for missing email, shipping name, or shipping address.`;
  } catch (error) {
    redirect(`/thank?error=${encodeURIComponent(errorMessage(error, "Stripe sync failed."))}` as Route);
  }
  redirect(`/thank?message=${encodeURIComponent(message)}` as Route);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}
