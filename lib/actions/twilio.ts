import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/normalization";
import { unsubscribePhone } from "@/lib/server/invites";

const stopWords = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export async function handleTwilioWebhook(request: Request) {
  const formData = await request.formData();
  const body = String(formData.get("Body") || "").trim().toUpperCase();
  const from = normalizePhone(String(formData.get("From") || ""));
  if (from && stopWords.has(body)) {
    await unsubscribePhone(from);
  }
  return new NextResponse("<Response></Response>", {
    headers: { "content-type": "text/xml" }
  });
}
