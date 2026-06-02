import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { exportPendingEmailBroadcastCsv } from "@/lib/server/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  await requireAdmin(profile);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Invalid broadcast.", { status: 400 });

  const csv = await exportPendingEmailBroadcastCsv(id);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="broadcast-${id}-remaining.csv"`
    }
  });
}
