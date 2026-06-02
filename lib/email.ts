import { runtimeEnv } from "@/lib/runtime-env";

export async function sendEmail({
  to,
  subject,
  text,
  html,
  fromName = "Alberta's Voice",
  fromEmailEnv,
  idempotencyKey
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName?: string;
  fromEmailEnv: "BROADCAST_FROM_EMAIL" | "INVITE_FROM_EMAIL";
  idempotencyKey?: string;
}) {
  const apiKey = await runtimeEnv("RESEND_API_KEY");
  const fromEmail = await runtimeEnv(fromEmailEnv);
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!fromEmail) throw new Error(`${fromEmailEnv} is required.`);

  const from = formatSender(fromEmail, fromName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {})
    },
    body: JSON.stringify({ from, to, subject, text, html })
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!response.ok) {
    throw new Error(payload.message || payload.name || `Resend failed with ${response.status}`);
  }
  return payload.id || null;
}

export async function sendEmailBatch({
  emails,
  fromEmailEnv,
  idempotencyKey
}: {
  emails: Array<{ to: string; subject: string; text: string; html?: string; fromName?: string }>;
  fromEmailEnv: "BROADCAST_FROM_EMAIL" | "INVITE_FROM_EMAIL";
  idempotencyKey: string;
}) {
  const apiKey = await runtimeEnv("RESEND_API_KEY");
  const fromEmail = await runtimeEnv(fromEmailEnv);
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!fromEmail) throw new Error(`${fromEmailEnv} is required.`);

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify(
      emails.map(({ fromName = "Alberta's Voice", ...email }) => ({
        ...email,
        from: formatSender(fromEmail, fromName)
      }))
    )
  });

  const payload = (await response.json().catch(() => ({}))) as {
    data?: Array<{ id?: string }>;
    message?: string;
    name?: string;
  };
  if (!response.ok) {
    throw new Error(payload.message || payload.name || `Resend failed with ${response.status}`);
  }
  if (!payload.data || payload.data.length !== emails.length) {
    throw new Error("Resend batch response did not include every email.");
  }
  return payload.data.map((email) => email.id || null);
}

function formatSender(fromEmail: string, fromName: string) {
  const email = fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail;
  return `${quoteDisplayName(fromName)} <${email.trim()}>`;
}

function quoteDisplayName(name: string) {
  const safeName = name.replace(/[\r\n]/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
  return `"${safeName || "Alberta's Voice"}"`;
}
