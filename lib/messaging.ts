import type { Invite } from "@/lib/types";

export function inviteUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export function subscriptionUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/subscription/${token}`;
}

export function smsInviteText(captainName: string, invite: Pick<Invite, "token">) {
  return `${captainName} invited you to choose whether to receive Alberta's Voice updates. You are not subscribed unless you opt in: ${inviteUrl(invite.token)}`;
}

export function emailInviteSubject(captainName: string) {
  return `${captainName} invited you to Alberta's Voice`;
}

export function emailInviteText(captainName: string, invite: Pick<Invite, "invitee_name" | "token">) {
  return `Hi ${invite.invitee_name},

${captainName} invited you to choose whether to receive Alberta's Voice updates.

You are not subscribed unless you opt in. Review the invitation and choose your preference here:
${inviteUrl(invite.token)}

If you do not want updates, you can decline from that page.`;
}

export function emailBroadcastText(body: string, token: string) {
  const manageUrl = subscriptionUrl(token);
  return `${body}

--
Alberta's Voice
Authorized by Alberta's Voice, Referendum Third Party Advertiser.
Contact: info@albertasvoice.ca
Website: https://albertasvoice.ca
TPA/compliance statement: https://albertasvoice.ca/disclaimer

You are receiving this because you opted in to Alberta's Voice email updates.
Manage your subscription or unsubscribe:
${manageUrl}
`;
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
