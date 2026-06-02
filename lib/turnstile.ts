import { runtimeEnv } from "@/lib/runtime-env";

export async function verifyTurnstileToken(token: FormDataEntryValue | null, remoteIp?: string | null) {
  const secret = await runtimeEnv("TURNSTILE_SECRET_KEY");
  const siteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

  if (!secret && !siteKey) return;
  if (!secret || !siteKey) {
    throw new Error("Human verification is not fully configured.");
  }
  if (!token || typeof token !== "string") {
    throw new Error("Complete the human verification check.");
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean };
  if (!response.ok || !payload.success) {
    throw new Error("Human verification failed. Please try again.");
  }
}

export function getRequestIp(headersList: Headers) {
  return headersList.get("cf-connecting-ip") || headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
