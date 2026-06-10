import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { exportCaptainsCsv, exportSubscribersCsv } from "@/lib/server/admin";
import { broadcastAudienceSchema, preferenceFilterSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  await requireAdmin(profile);
  const url = new URL(request.url);
  const audience = broadcastAudienceSchema.parse(url.searchParams.get("audience") || "SUBSCRIBERS");
  const preference = preferenceFilterSchema.parse(url.searchParams.get("preference") || "ALL");
  const csv = audience === "CAPTAINS" ? await exportCaptainsCsv() : await exportSubscribersCsv(preference);
  const filename = audience === "CAPTAINS" ? "captains.csv" : `subscribers-${preference.toLowerCase()}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
