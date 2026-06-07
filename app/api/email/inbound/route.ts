import { NextRequest, NextResponse } from "next/server";
import { processCaptainReplyWebhook } from "@/lib/server/captain-replies";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const result = await processCaptainReplyWebhook({
      payload,
      headers: {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature")
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Invalid inbound email webhook.";
    return new NextResponse(message, { status: 400 });
  }
}
