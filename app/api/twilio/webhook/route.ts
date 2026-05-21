import { handleTwilioWebhook } from "@/lib/actions/twilio";

export async function POST(request: Request) {
  return handleTwilioWebhook(request);
}
