import crypto from "node:crypto";
import { sendEmail } from "@/lib/email";
import { runtimeEnv } from "@/lib/runtime-env";
import { createServiceClient } from "@/lib/supabase/server";

const CAPTAIN_REPLY_DOMAIN = "join.albertasvoice.ca";

type ResendInboundEvent = {
  type?: string;
  data?: {
    email_id?: string;
    message_id?: string;
    subject?: string | null;
    from?: string | null;
    to?: string[];
  };
};

type ReceivedEmail = {
  from?: string | null;
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  to?: string[];
};

export async function processCaptainReplyWebhook({
  payload,
  headers
}: {
  payload: string;
  headers: { id: string | null; timestamp: string | null; signature: string | null };
}) {
  const webhookSecret = await runtimeEnv("RESEND_WEBHOOK_SECRET");
  if (!webhookSecret) throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
  const event = verifyResendWebhook(payload, headers, webhookSecret) as ResendInboundEvent;
  if (event.type !== "email.received") return { forwarded: false, reason: "ignored_event" };

  const emailId = event.data?.email_id;
  if (!emailId) throw new Error("Inbound email payload is missing data.email_id.");

  const alias = extractCaptainAlias(event.data?.to || []);
  if (!alias) return { forwarded: false, reason: "no_captain_alias" };

  const captain = await findCaptainByAlias(alias);
  if (!captain?.email) return { forwarded: false, reason: "captain_not_found" };

  const email = await fetchReceivedEmail(emailId);
  await forwardReplyToCaptain({
    captainEmail: captain.email,
    captainName: captain.name || "Captain",
    received: {
      from: email.from || event.data?.from || "Unknown sender",
      subject: email.subject || event.data?.subject || "Reply to your Alberta's Voice message",
      text: email.text,
      html: email.html,
      to: email.to || event.data?.to || []
    }
  });

  return { forwarded: true, captainId: captain.id };
}

export function extractCaptainAlias(recipients: string[]) {
  for (const recipient of recipients) {
    const address = extractEmailAddress(recipient).toLowerCase();
    const match = address.match(new RegExp(`^updates\\+([a-z0-9_]+)@${escapeRegExp(CAPTAIN_REPLY_DOMAIN)}$`));
    if (match) return match[1];
  }
  return null;
}

export function verifyResendWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string
) {
  if (!headers.id || !headers.timestamp || !headers.signature) throw new Error("Missing webhook signature headers.");
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 5 * 60) {
    throw new Error("Webhook timestamp is outside the allowed window.");
  }

  const secretValue = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(secretValue, "base64");
  const signedPayload = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", key).update(signedPayload).digest("base64");
  const signatures = headers.signature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean);

  if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
    throw new Error("Invalid webhook signature.");
  }
  return JSON.parse(payload);
}

async function findCaptainByAlias(alias: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("id,name,email")
    .eq("captain_email_alias", alias)
    .single();
  if (error) {
    if (errorMessage(error).includes("captain_email_alias")) {
      throw new Error("Missing profiles.captain_email_alias. Run supabase/migrations/202606070003_add_captain_email_aliases.sql in Supabase.");
    }
    return null;
  }
  return data as { id: string; name: string | null; email: string | null } | null;
}

async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const apiKey = await runtimeEnv("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  const payload = (await response.json().catch(() => ({}))) as ReceivedEmail & { message?: string; name?: string };
  if (!response.ok) throw new Error(payload.message || payload.name || `Resend receiving API failed with ${response.status}`);
  return payload;
}

async function forwardReplyToCaptain({
  captainEmail,
  captainName,
  received
}: {
  captainEmail: string;
  captainName: string;
  received: { from: string; subject: string; to: string[]; text?: string | null; html?: string | null };
}) {
  const subject = `Reply to your Alberta's Voice message: ${received.subject}`;
  const rawBodyText = received.text?.trim() || htmlToPlainText(received.html || "");
  const replyParts = splitReplyText(rawBodyText);
  const bodyText = replyParts.visibleText || rawBodyText || "(No plain text body was provided.)";
  const text = `Hi ${captainName},

Someone replied to a direct email you sent through Alberta's Voice.

From: ${received.from}
To: ${received.to.join(", ")}
Subject: ${received.subject}

Reply body:

${bodyText}

--
This is a one-way masked forward. Replying from your personal inbox may expose your email address.`;

  const html = `<p>Hi ${escapeHtml(captainName)},</p>
<p>Someone replied to a direct email you sent through Alberta&apos;s Voice.</p>
<p><strong>From:</strong> ${escapeHtml(received.from)}<br>
<strong>To:</strong> ${escapeHtml(received.to.join(", "))}<br>
<strong>Subject:</strong> ${escapeHtml(received.subject)}</p>
<hr>
<div style="font-family:Arial,sans-serif;line-height:1.5;">${plainTextToHtml(bodyText)}</div>
${replyParts.quotedText ? renderGmailQuote(replyParts.quotedText) : ""}
<p style="color:#6b7280;font-size:14px;">This is a one-way masked forward. Replying from your personal inbox may expose your email address.</p>`;

  await sendEmail({
    to: captainEmail,
    subject,
    text,
    html,
    fromEmailEnv: "BROADCAST_FROM_EMAIL",
    fromName: "Alberta's Voice",
    idempotencyKey: `captain-reply/${crypto.createHash("sha256").update(`${captainEmail}\n${received.from}\n${received.subject}\n${bodyText}`).digest("hex")}`
  });
}

function extractEmailAddress(value: string) {
  return value.match(/<([^>]+)>/)?.[1]?.trim() || value.trim();
}

export function splitReplyText(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const quoteStart = findQuotedReplyStart(lines);
  if (quoteStart === -1) return { visibleText: lines.join("\n").trim(), quotedText: "" };

  return {
    visibleText: lines.slice(0, quoteStart).join("\n").trim(),
    quotedText: lines.slice(quoteStart).join("\n").trim()
  };
}

function findQuotedReplyStart(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const previousLine = lines[index - 1]?.trim() || "";

    if (!line) continue;
    if (/^-{2,}\s*original message\s*-{2,}$/i.test(line)) return index;
    if (/^_{5,}$/.test(line)) return index;
    if (/^>/.test(line)) return index;
    if (/\bwrote:\s*$/i.test(line)) return previousLine.toLowerCase().startsWith("on ") ? index - 1 : index;
    if (/^from:\s.+/i.test(line) && looksLikeForwardedHeader(lines, index)) return index;
  }
  return -1;
}

function looksLikeForwardedHeader(lines: string[], startIndex: number) {
  const headerWindow = lines.slice(startIndex, startIndex + 6).map((line) => line.trim().toLowerCase());
  return headerWindow.some((line) => line.startsWith("sent:") || line.startsWith("date:")) &&
    headerWindow.some((line) => line.startsWith("to:")) &&
    headerWindow.some((line) => line.startsWith("subject:"));
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function plainTextToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px 0;">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderGmailQuote(text: string) {
  const lines = text.split("\n");
  const headerEnd = lines.findIndex((line) => /\bwrote:\s*$/i.test(line.trim()));
  const headerLines = headerEnd >= 0 ? lines.slice(0, headerEnd + 1) : [];
  const quotedLines = (headerEnd >= 0 ? lines.slice(headerEnd + 1) : lines).map((line) => line.replace(/^>\s?/, ""));
  const header = headerLines.join("\n").trim();
  const quoted = quotedLines.join("\n").trim();

  return `<div class="gmail_quote" style="margin-top:16px;">
${header ? `<div dir="ltr" class="gmail_attr">${escapeHtml(header).replace(/\n/g, "<br>")}</div>` : ""}
<blockquote class="gmail_quote" style="margin:0 0 0 0.8ex;border-left:1px solid #ccc;padding-left:1ex;">
${plainTextToHtml(quoted || text)}
</blockquote>
</div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return "Unknown error";
}
