export async function sendEmail({
  to,
  subject,
  text
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BROADCAST_FROM_EMAIL || process.env.INVITE_FROM_EMAIL;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!from) throw new Error("BROADCAST_FROM_EMAIL or INVITE_FROM_EMAIL is required.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from, to, subject, text })
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!response.ok) {
    throw new Error(payload.message || payload.name || `Resend failed with ${response.status}`);
  }
  return payload.id || null;
}
