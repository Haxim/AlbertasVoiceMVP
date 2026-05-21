import type { Invite } from "@/lib/types";

export function inviteUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export function smsInviteText(captainName: string, invite: Pick<Invite, "token">) {
  return `${captainName} invited you to choose whether to receive Alberta's Voice updates. You are not subscribed unless you opt in: ${inviteUrl(invite.token)}`;
}

export async function sendSmsInvite(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    console.warn("Twilio env missing; invite created but SMS not sent.");
    return { skipped: true };
  }

  const params = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else if (from) params.set("From", from);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  if (!response.ok) throw new Error(`Twilio invite failed: ${response.status}`);
  return response.json();
}
