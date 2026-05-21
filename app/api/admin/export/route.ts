import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { exportSubscribersCsv } from "@/lib/server/admin";
import { preferenceFilterSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  await requireAdmin(profile);
  const url = new URL(request.url);
  const preference = preferenceFilterSchema.parse(url.searchParams.get("preference") || "ALL");
  const csv = await exportSubscribersCsv(preference);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="subscribers-${preference.toLowerCase()}.csv"`
    }
  });
}
