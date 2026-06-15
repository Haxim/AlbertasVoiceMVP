import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { exportCaptainSignupReportCsv } from "@/lib/server/admin";
import { captainSignupReportSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  await requireAdmin(profile);
  const url = new URL(request.url);
  const filters = captainSignupReportSchema.parse({
    startDate: url.searchParams.get("startDate") || "",
    endDate: url.searchParams.get("endDate") || "",
    minSignups: url.searchParams.get("minSignups") || 20
  });
  const csv = await exportCaptainSignupReportCsv({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    minSignups: filters.minSignups
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="captain-signups-${filenameRange(filters)}.csv"`
    }
  });
}

function filenameRange(filters: { startDate?: string; endDate?: string }) {
  if (filters.startDate || filters.endDate) return `${filters.startDate || "start"}-to-${filters.endDate || "today"}`;
  return "all-time";
}
