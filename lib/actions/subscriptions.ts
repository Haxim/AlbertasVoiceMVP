"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { unsubscribeByToken, updateSubscriptionPreference } from "@/lib/server/subscriptions";
import { subscriptionTokenSchema, updateSubscriptionSchema } from "@/lib/validation";
import { getRequestIp } from "@/lib/turnstile";

export async function updateSubscription(formData: FormData) {
  const parsed = updateSubscriptionSchema.parse({
    token: formData.get("token"),
    preference: formData.get("preference")
  });
  const h = await headers();
  await updateSubscriptionPreference(parsed.token, parsed.preference, {
    ip: getRequestIp(h),
    userAgent: h.get("user-agent")
  });
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
