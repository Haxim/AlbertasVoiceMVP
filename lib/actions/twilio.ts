import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { normalizePhone } from "@/lib/normalization";
import { runtimeEnv } from "@/lib/runtime-env";
import { unsubscribePhone } from "@/lib/server/invites";

const stopWords = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export async function handleTwilioWebhook(request: Request) {
  const formData = await request.formData();
  if (!(await verifyTwilioSignature(request, formData))) {
    return new NextResponse("Invalid signature.", { status: 403 });
  }

  const body = String(formData.get("Body") || "").trim().toUpperCase();
  const from = normalizePhone(String(formData.get("From") || ""));
  if (from && stopWords.has(body)) {
    await unsubscribePhone(from);
  }
  return new NextResponse("<Response></Response>", {
    headers: { "content-type": "text/xml" }
  });
}

export async function verifyTwilioSignature(request: Request, formData: FormData) {
  const authToken = await runtimeEnv("TWILIO_AUTH_TOKEN");
  if (!authToken) return false;

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const urls = await candidateWebhookUrls(request);
  return urls.some((url) => {
    const expected = twilioSignature(url, formData, authToken);
    return timingSafeEqual(signature, expected);
  });
}

async function candidateWebhookUrls(request: Request) {
  const requestUrl = new URL(request.url);
  const urls = [requestUrl.toString()];
  const appUrl = await runtimeEnv("NEXT_PUBLIC_APP_URL");

  if (appUrl) {
    const publicUrl = new URL(appUrl.replace(/\/$/, ""));
    publicUrl.pathname = requestUrl.pathname;
    publicUrl.search = requestUrl.search;
    urls.push(publicUrl.toString());
  }

  return Array.from(new Set(urls));
}

export function twilioSignature(url: string, formData: FormData, authToken: string) {
  const fields = Array.from(formData.entries())
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  const payload = fields.reduce((text, [key, value]) => `${text}${key}${value}`, url);
  return crypto.createHmac("sha1", authToken).update(payload).digest("base64");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
