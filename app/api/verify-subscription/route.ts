import { NextRequest, NextResponse } from "next/server";
import { confirmPublicUpdatesSignup } from "@/lib/server/public-updates";
import { getRequestIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const status = await confirmPublicUpdatesSignup(token, {
    ip: getRequestIp(request.headers),
    userAgent: request.headers.get("user-agent")
  });
  const destination = new URL("/", request.url);
  destination.searchParams.set("verification", status);
  return NextResponse.redirect(destination);
}
