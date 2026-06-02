import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Preference, Subscriber } from "@/lib/types";

export async function getSubscriptionByToken(token: string) {
  noStore();
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscribers")
    .select("id,name,email,phone,preference,email_consent,sms_consent,unsubscribed_at,subscription_token")
    .eq("subscription_token", token)
    .single();
  if (error || !data) return null;
  return data as Pick<
    Subscriber,
    "id" | "name" | "email" | "phone" | "preference" | "email_consent" | "sms_consent" | "unsubscribed_at" | "subscription_token"
  >;
}

export async function updateSubscriptionPreference(token: string, preference: Preference, requestMeta: RequestMeta = {}) {
  const service = createServiceClient();
  const { data: subscriber, error } = await service
    .from("subscribers")
    .update({
      preference,
      unsubscribed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq("subscription_token", token)
    .select("id,invite_id,normalized_email")
    .single();
  if (error || !subscriber) throw new Error("Subscription not found.");

  if (subscriber.normalized_email) {
    await service.from("suppression_list").delete().eq("normalized_email", subscriber.normalized_email);
  }

  await logConsentEvent({
    invite_id: subscriber.invite_id,
    subscriber_id: subscriber.id,
    event_type: "PREFERENCE_UPDATED",
    channel: "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    metadata: { preference }
  });
}

export async function unsubscribeByToken(token: string, requestMeta: RequestMeta = {}) {
  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data: subscriber, error } = await service
    .from("subscribers")
    .update({
      unsubscribed_at: now,
      updated_at: now
    })
    .eq("subscription_token", token)
    .select("id,invite_id,normalized_email,normalized_phone")
    .single();
  if (error || !subscriber) throw new Error("Subscription not found.");

  if (subscriber.normalized_email) {
    await service.from("suppression_list").upsert(
      {
        normalized_email: subscriber.normalized_email,
        reason: "EMAIL_UNSUBSCRIBE"
      },
      { onConflict: "normalized_email" }
    );
  }

  await logConsentEvent({
    invite_id: subscriber.invite_id,
    subscriber_id: subscriber.id,
    event_type: "UNSUBSCRIBED",
    channel: "EMAIL",
    ip_address: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    metadata: { reason: "EMAIL_UNSUBSCRIBE" }
  });
}

type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

async function logConsentEvent(event: {
  invite_id?: string | null;
  subscriber_id?: string | null;
  event_type: string;
  channel?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceClient();
  await service.from("consent_events").insert(event);
}
