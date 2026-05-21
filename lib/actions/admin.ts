"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { preferenceFilterSchema } from "@/lib/validation";
import { previewAudienceCount } from "@/lib/server/admin";

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
