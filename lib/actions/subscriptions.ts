"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/normalization";
import { startPublicUpdatesSignup } from "@/lib/server/public-updates";
import { unsubscribeByToken, updateSubscriptionPreference } from "@/lib/server/subscriptions";
import { subscriptionTokenSchema, updateSubscriptionSchema } from "@/lib/validation";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";

export async function signupForUpdates(formData: FormData) {
  const h = await headers();
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
  } catch (error) {
    redirect(`/?message=${encodeURIComponent(error instanceof Error ? error.message : "Human verification failed.")}`);
  }

  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const consent = formData.get("consent") === "yes";
  if (!firstName || !lastName || !normalizedEmail) {
    redirect(`/?message=${encodeURIComponent("Add your name and a valid email address.")}`);
  }
  if (!consent) {
    redirect(`/?message=${encodeURIComponent("Consent is required to sign up for updates.")}`);
  }

  let message: string;
  try {
    const proto = h.get("x-forwarded-proto") || "https";
    const host = h.get("x-forwarded-host") || h.get("host");
    const origin = host ? `${proto}://${host}` : null;
    const result = await startPublicUpdatesSignup(
      { firstName, lastName, email, origin },
      { ip: getRequestIp(h), userAgent: h.get("user-agent") }
    );
    message = result.alreadySubscribed
      ? "You are already signed up for Alberta's Voice updates."
      : "Check your email and click the verification link to finish signing up.";
  } catch (error) {
    message = error instanceof Error ? error.message : "We could not start your signup. Please try again.";
  }
  redirect(`/?message=${encodeURIComponent(message)}`);
}

export async function updateSubscription(formData: FormData) {
  const parsed = updateSubscriptionSchema.parse({
    token: formData.get("token"),
    preference: formData.get("preference"),
    captainEmailConsent: formData.get("captainEmailConsent") === "yes"
  });
  const h = await headers();
  await updateSubscriptionPreference(
    parsed.token,
    {
      preference: parsed.preference,
      captainEmailConsent: parsed.captainEmailConsent
    },
    {
      ip: getRequestIp(h),
      userAgent: h.get("user-agent")
    }
  );
  redirect(`/subscription/${parsed.token}?message=${encodeURIComponent("Your subscription preference has been updated.")}`);
}

export async function unsubscribeSubscription(formData: FormData) {
  const parsed = subscriptionTokenSchema.parse({ token: formData.get("token") });
  const h = await headers();
  await unsubscribeByToken(parsed.token, {
    ip: getRequestIp(h),
    userAgent: h.get("user-agent")
  });
  redirect(`/subscription/${parsed.token}?message=${encodeURIComponent("You have been unsubscribed from email updates.")}`);
}
