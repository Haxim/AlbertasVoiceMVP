import type { Invite } from "@/lib/types";
import { getRuntimeAppUrl } from "@/lib/app-url";
import { runtimeEnv } from "@/lib/runtime-env";

export async function inviteUrl(token: string) {
  return `${await getRuntimeAppUrl()}/invite/${token}`;
}

export async function subscriptionUrl(token: string) {
  return `${await getRuntimeAppUrl()}/subscription/${token}`;
}

export async function smsInviteText(captainName: string, invite: Pick<Invite, "token">) {
  return `${captainName} invited you to choose whether to receive Alberta's Voice updates. You are not subscribed unless you opt in: ${await inviteUrl(invite.token)}`;
}

export function emailInviteSubject(captainName: string) {
  return `${captainName} invited you to learn more about Alberta's Voice`;
}

export async function emailInviteText(captainName: string, invite: Pick<Invite, "invitee_name" | "token">) {
  return `Hi ${invite.invitee_name},

${captainName} thought you might be interested in learning more about Alberta's Voice.

Alberta's Voice is a grassroots campaign working to keep Alberta in Canada and encourage Albertans to vote No on the nine referendum questions. We share information, connect supporters, and help Albertans take action in support of Alberta's future within Canada.

You are not subscribed to Alberta's Voice updates. To learn more and choose whether you'd like to receive future emails, visit:
${await inviteUrl(invite.token)}

If you'd prefer not to hear from us, you can decline the invitation from that page and you will not receive further communications.

Thank you for taking a moment to learn more about Alberta's Voice.`;
}

export async function emailInviteHtml(captainName: string, invite: Pick<Invite, "invitee_name" | "token">) {
  const invitationUrl = await inviteUrl(invite.token);
  const body = `Hi ${invite.invitee_name},

${captainName} thought you might be interested in learning more about Alberta's Voice.

Alberta's Voice is a grassroots campaign working to keep Alberta in Canada and encourage Albertans to vote No on the nine referendum questions. We share information, connect supporters, and help Albertans take action in support of Alberta's future within Canada.

You are not subscribed to Alberta's Voice updates. To learn more and choose whether you'd like to receive future emails, visit:

If you'd prefer not to hear from us, you can decline the invitation from that page and you will not receive further communications.

Thank you for taking a moment to learn more about Alberta's Voice.`;

  return renderAlbertaVoiceEmail({
    body,
    ctaUrl: invitationUrl,
    ctaLabel: "Review Invitation",
    notice: "You are receiving this one-time invitation from Alberta's Voice. You are not subscribed unless you opt in."
  });
}

export async function emailBroadcastText(body: string, token: string) {
  const manageUrl = await subscriptionUrl(token);
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

export async function emailBroadcastHtml(body: string, token: string) {
  const manageUrl = await subscriptionUrl(token);
  return renderAlbertaVoiceEmail({
    body,
    ctaUrl: manageUrl,
    ctaLabel: "Manage Email Preferences",
    notice: "You are receiving this because you opted in to Alberta's Voice email updates."
  });
}

export async function emailCaptainMessageText(body: string, token: string, captainName: string) {
  const manageUrl = await subscriptionUrl(token);
  return `${body}

--
Alberta's Voice
Authorized by Alberta's Voice, Referendum Third Party Advertiser.
Contact: info@albertasvoice.ca
Website: https://albertasvoice.ca
TPA/compliance statement: https://albertasvoice.ca/disclaimer

You are receiving this because you opted in to direct emails from ${captainName}.
Manage your subscription or unsubscribe:
${manageUrl}
`;
}

export async function emailCaptainMessageHtml(body: string, token: string, captainName: string) {
  const manageUrl = await subscriptionUrl(token);
  return renderAlbertaVoiceEmail({
    body,
    ctaUrl: manageUrl,
    ctaLabel: "Manage Email Preferences",
    notice: `You are receiving this because you opted in to direct emails from ${captainName}.`
  });
}

export function emailInternalBroadcastText(body: string) {
  return `${body}

--
Alberta's Voice
Authorized by Alberta's Voice, Referendum Third Party Advertiser.
Contact: info@albertasvoice.ca
Website: https://albertasvoice.ca
TPA/compliance statement: https://albertasvoice.ca/disclaimer
`;
}

export function emailInternalBroadcastHtml(body: string) {
  return renderAlbertaVoiceEmail({
    body,
    ctaUrl: "https://albertasvoice.ca",
    ctaLabel: "Visit Alberta's Voice",
    notice: "You are receiving this because you are an Alberta's Voice captain."
  });
}

function renderAlbertaVoiceEmail({
  body,
  ctaUrl,
  ctaLabel,
  notice
}: {
  body: string;
  ctaUrl: string;
  ctaLabel: string;
  notice: string;
}) {
  const messageHtml = markdownToEmailHtml(body);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alberta's Voice Update</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#003754;padding:36px 32px;">
              <img src="https://albertasvoice.ca/assets/logo-email.png" width="128" height="128" alt="Alberta's Voice" style="display:block;width:128px;height:128px;margin:0 auto 18px auto;border:0;">
              <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.2;">
                Alberta's Voice
              </h1>
              <p style="margin:12px 0 0 0;color:#dbeafe;font-size:16px;">
                A Voice for Every Albertan
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <div style="font-size:16px;line-height:1.7;color:#374151;">
                ${messageHtml}
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:40px auto;">
                <tr>
                  <td align="center" bgcolor="#c8102e" style="border-radius:8px;">
                    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#6b7280;">
                ${escapeHtml(notice)}
              </p>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
                Authorized by Alberta's Voice, Referendum Third Party Advertiser. Contact:
                <a href="mailto:info@albertasvoice.ca" style="color:#003754;text-decoration:underline;">info@albertasvoice.ca</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 40px 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
              <p style="margin:0;text-align:center;font-size:20px;font-weight:700;color:#003754;">
                No to the Nine. Stay in Canada.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function markdownToEmailHtml(markdown: string) {
  const blocks = markdown.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split(/\n/);
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        const items = lines
          .map((line) => `<li style="margin:0 0 8px 0;">${inlineMarkdownToHtml(line.replace(/^\s*[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0 0 20px 20px;padding:0;">${items}</ul>`;
      }

      const heading = block.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const size = heading[1].length === 1 ? 30 : heading[1].length === 2 ? 24 : 20;
        return `<h2 style="margin:0 0 20px 0;font-size:${size}px;line-height:1.2;color:#003754;font-weight:700;">${inlineMarkdownToHtml(
          heading[2]
        )}</h2>`;
      }

      return `<p style="margin:0 0 20px 0;font-size:16px;line-height:1.7;color:#374151;">${inlineMarkdownToHtml(
        lines.join("\n")
      ).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

function inlineMarkdownToHtml(markdown: string) {
  return escapeHtml(markdown)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" style="color:#003754;text-decoration:underline;">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendSmsInvite(to: string, body: string) {
  const accountSid = await runtimeEnv("TWILIO_ACCOUNT_SID");
  const authToken = await runtimeEnv("TWILIO_AUTH_TOKEN");
  const from = await runtimeEnv("TWILIO_FROM_PHONE");
  const messagingServiceSid = await runtimeEnv("TWILIO_MESSAGING_SERVICE_SID");
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
