"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireCaptain } from "@/lib/auth";
import { sendCaptainEmailMessage as sendCaptainEmailMessageServer } from "@/lib/server/captain-messages";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";
import { captainEmailMessageSchema } from "@/lib/validation";

export async function sendCaptainEmailMessage(formData: FormData) {
  const captain = await requireCaptain();
  const h = await headers();
  const parsed = captainEmailMessageSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    confirmConsent: formData.get("confirmConsent")
  });
  if (!parsed.success) {
    redirect(`/dashboard?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid message.")}`);
  }

  let message = "Email sent.";
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    const result = await sendCaptainEmailMessageServer({
      captain,
      subject: parsed.data.subject,
      body: parsed.data.body
    });
    message = batchResultMessage(result);
  } catch (error) {
    redirect(`/dashboard?error=${encodeURIComponent(errorMessage(error, "Direct email failed."))}`);
  }
  redirect(`/dashboard?message=${encodeURIComponent(message)}`);
}

function batchResultMessage(result: { sent: number; failed: number; remaining: number }) {
  if (result.sent === 0 && result.failed === 0) return "No subscribers currently allow direct emails from you.";
  return `Processed direct email batch: ${result.sent} sent, ${result.failed} failed, ${result.remaining} remaining.`;
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
