"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { emailBroadcastSchema, preferenceFilterSchema } from "@/lib/validation";
import { previewAudienceCount, sendEmailBroadcast as sendEmailBroadcastServer } from "@/lib/server/admin";

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
  const parsed = emailBroadcastSchema.safeParse({
    preference: formData.get("preference"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    confirmConsent: formData.get("confirmConsent")
  });
  if (!parsed.success) {
    redirect(`/admin?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid broadcast.")}`);
  }

  try {
    const result = await sendEmailBroadcastServer({
      admin,
      preference: parsed.data.preference,
      subject: parsed.data.subject,
      body: parsed.data.body
    });
    redirect(`/admin?message=${encodeURIComponent(`Email sent to ${result.audienceCount} subscribers. ${result.failed} failed.`)}`);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(error instanceof Error ? error.message : "Email broadcast failed.")}`);
  }
}
