"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { emailBroadcastSchema, preferenceFilterSchema } from "@/lib/validation";
import {
  previewAudienceCount,
  resumeEmailBroadcast as resumeEmailBroadcastServer,
  sendEmailBroadcast as sendEmailBroadcastServer
} from "@/lib/server/admin";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";

export async function previewBroadcastAudience(formData: FormData) {
  await requireAdmin();
  const preference = preferenceFilterSchema.parse(formData.get("preference") || "ALL");
  const count = await previewAudienceCount(preference);
  redirect(`/admin/preview?preference=${preference}&count=${count}`);
}

export async function adminExportSubscribers(formData: FormData) {
  await requireAdmin();
  const preference = preferenceFilterSchema.parse(formData.get("preference") || "ALL");
  redirect(`/api/admin/export?preference=${preference}`);
}

export async function sendEmailBroadcast(formData: FormData) {
  const admin = await requireAdmin();
  const h = await headers();
  const parsed = emailBroadcastSchema.safeParse({
    preference: formData.get("preference"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    confirmConsent: formData.get("confirmConsent")
  });
  if (!parsed.success) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid broadcast.")}`);
  }

  let message = "Email sent.";
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    const result = await sendEmailBroadcastServer({
      admin,
      preference: parsed.data.preference,
      subject: parsed.data.subject,
      body: parsed.data.body
    });
    message = batchResultMessage(result);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(errorMessage(error, "Email broadcast failed."))}`);
  }
  redirect(`/admin?message=${encodeURIComponent(message)}`);
}

export async function resumeEmailBroadcast(formData: FormData) {
  await requireAdmin();
  const h = await headers();
  const broadcastId = String(formData.get("broadcastId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(broadcastId)) redirect("/admin?error=Invalid%20broadcast.");

  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
    const result = await resumeEmailBroadcastServer(broadcastId);
    redirect(`/admin?message=${encodeURIComponent(batchResultMessage(result))}`);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(errorMessage(error, "Email broadcast resume failed."))}`);
  }
}

function batchResultMessage(result: { sent: number; failed: number; remaining: number }) {
  return `Processed email batch: ${result.sent} sent, ${result.failed} failed, ${result.remaining} remaining.`;
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
