"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminAudienceSelectionSchema, emailBroadcastSchema, preferenceFilterSchema } from "@/lib/validation";
import {
  previewAudienceCount,
  resumeEmailBroadcast as resumeEmailBroadcastServer,
  sendEmailBroadcast as sendEmailBroadcastServer
} from "@/lib/server/admin";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";
import type { BroadcastAudience, PreferenceFilter } from "@/lib/types";

export async function previewBroadcastAudience(formData: FormData) {
  await requireAdmin();
  const selection = adminAudienceSelectionSchema.parse(formData.get("preference") || "ALL_UPDATES");
  const audience = audienceForSelection(selection);
  const preference = preferenceForSelection(selection);
  const count = await previewAudienceCount(audience, preference);
  redirect(`/admin/preview?selection=${selection}&audience=${audience}&count=${count}`);
}

export async function adminExportCsv(formData: FormData) {
  await requireAdmin();
  const selectedExport = formData.get("export") || "ALL";
  if (selectedExport === "CAPTAINS") redirect("/api/admin/export?audience=CAPTAINS");
  const preference = preferenceFilterSchema.parse(selectedExport);
  redirect(`/api/admin/export?audience=SUBSCRIBERS&preference=${preference}`);
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
    const audience = audienceForSelection(parsed.data.preference);
    const preference = preferenceForSelection(parsed.data.preference);
    const result = await sendEmailBroadcastServer({
      admin,
      audience,
      preference,
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

function audienceForSelection(selection: string): BroadcastAudience {
  return selection === "CAPTAINS" ? "CAPTAINS" : "SUBSCRIBERS";
}

function preferenceForSelection(selection: string): PreferenceFilter {
  return selection === "CAPTAINS" ? "ALL" : preferenceFilterSchema.parse(selection);
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
