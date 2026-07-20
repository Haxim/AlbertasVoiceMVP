import { NextRequest, NextResponse } from "next/server";
import { processIncompleteEmailBroadcastBatches } from "@/lib/server/admin";
import { runtimeEnv } from "@/lib/runtime-env";

export async function GET(request: NextRequest) {
  return processBroadcastCronRequest(request);
}

export async function POST(request: NextRequest) {
  return processBroadcastCronRequest(request);
}

async function processBroadcastCronRequest(request: NextRequest) {
  const expectedSecret = await runtimeEnv("ADMIN_BROADCAST_CRON_SECRET");
  if (!expectedSecret) {
    return NextResponse.json({ error: "ADMIN_BROADCAST_CRON_SECRET is not configured." }, { status: 503 });
  }

  const providedSecret = cronSecretFromRequest(request);
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "3", 10);
  const results = await processIncompleteEmailBroadcastBatches(Number.isFinite(limit) ? limit : 3);
  return NextResponse.json(
    {
      processed: results.length,
      results,
      remaining: results.reduce((total, result) => total + result.remaining, 0)
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}

function cronSecretFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret");
}
