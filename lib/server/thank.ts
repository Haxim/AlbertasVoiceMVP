import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { runtimeEnv } from "@/lib/runtime-env";
import type { Profile } from "@/lib/types";

export type ThankYouEmailLogRow = {
  id: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  provider_message_id: string | null;
  sender?: { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null;
};

export type StripeDonorRow = {
  id: string;
  stripe_customer_id: string | null;
  name: string | null;
  email: string;
  currency: string;
  amount_cents: number;
  charge_count: number;
  last_donation_at: string | null;
  thank_you_sent_at: string | null;
  synced_at: string;
};

export async function logThankYouEmailSent({
  sender,
  recipientEmail,
  subject,
  providerMessageId,
  donorId
}: {
  sender: Profile;
  recipientEmail: string;
  subject: string;
  providerMessageId: string | null;
  donorId?: string | null;
}) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("thank_you_emails")
    .insert({
      sender_id: sender.id,
      donor_id: donorId || null,
      recipient_email: recipientEmail,
      subject,
      provider_message_id: providerMessageId
    })
    .select("sent_at")
    .single();
  if (error) throw error;

  if (donorId) {
    const { error: donorError } = await service
      .from("stripe_donors")
      .update({ thank_you_sent_at: data?.sent_at || new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", donorId);
    if (donorError) throw donorError;
  }
}

export async function getThankYouEmailLog(limit = 50) {
  noStore();
  const service = createServiceClient();
  const rowLimit = Math.min(Math.max(limit, 1), 200);
  const { data, error } = await service
    .from("thank_you_emails")
    .select("id,recipient_email,subject,sent_at,provider_message_id,sender:sender_id(name,email)")
    .order("sent_at", { ascending: false })
    .limit(rowLimit);
  if (error) throw error;
  return (data || []) as ThankYouEmailLogRow[];
}

export async function getStripeDonorsOverThreshold(limit = 200) {
  noStore();
  const service = createServiceClient();
  const rowLimit = Math.min(Math.max(limit, 1), 500);
  const { data, error } = await service
    .from("stripe_donors")
    .select("id,stripe_customer_id,name,email,currency,amount_cents,charge_count,last_donation_at,thank_you_sent_at,synced_at")
    .gte("amount_cents", 25001)
    .order("thank_you_sent_at", { ascending: true, nullsFirst: true })
    .order("amount_cents", { ascending: false })
    .limit(rowLimit);
  if (error) throw error;
  return (data || []) as StripeDonorRow[];
}

export async function syncStripeDonorsOverThreshold() {
  const charges = await fetchStripeCharges();
  const donors = aggregateStripeDonorsForThankYou(charges).filter((donor) => donor.amount_cents > 25000);
  if (!donors.length) return { synced: 0, scanned: charges.length };

  const service = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await service.from("stripe_donors").upsert(
    donors.map((donor) => ({
      ...donor,
      synced_at: now,
      updated_at: now
    })),
    { onConflict: "name,email,currency" }
  );
  if (error) throw error;
  return { synced: donors.length, scanned: charges.length };
}

type StripeCharge = {
  id: string;
  amount: number;
  amount_captured?: number | null;
  currency: string;
  created: number;
  paid?: boolean;
  refunded?: boolean;
  status?: string;
  customer?: string | null;
  billing_details?: {
    name?: string | null;
    email?: string | null;
  } | null;
  shipping?: {
    name?: string | null;
  } | null;
  receipt_email?: string | null;
};

async function fetchStripeCharges() {
  const apiKey = await runtimeEnv("STRIPE_RESTRICTED_KEY") || await runtimeEnv("STRIPE_SECRET_KEY");
  if (!apiKey) throw new Error("STRIPE_RESTRICTED_KEY or STRIPE_SECRET_KEY is required.");

  const charges: StripeCharge[] = [];
  let startingAfter: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const params = new URLSearchParams({ limit: "100" });
    if (startingAfter) params.set("starting_after", startingAfter);
    const response = await fetch(`https://api.stripe.com/v1/charges?${params.toString()}`, {
      headers: { authorization: `Bearer ${apiKey}` }
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: StripeCharge[];
      has_more?: boolean;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(payload.error?.message || `Stripe sync failed with ${response.status}.`);
    const pageCharges = payload.data || [];
    charges.push(...pageCharges);
    if (!payload.has_more || !pageCharges.length) break;
    startingAfter = pageCharges[pageCharges.length - 1].id;
  }
  return charges;
}

export function aggregateStripeDonorsForThankYou(charges: StripeCharge[]) {
  const donors = new Map<string, {
    stripe_customer_id: string | null;
    name: string | null;
    email: string;
    currency: string;
    amount_cents: number;
    charge_count: number;
    last_donation_at: string | null;
  }>();

  for (const charge of charges) {
    if (!isSuccessfulDonationCharge(charge)) continue;
    const email = (charge.billing_details?.email || charge.receipt_email || "").trim().toLowerCase();
    const donorName = charge.shipping?.name?.trim();
    if (!email || !donorName) continue;
    const currency = charge.currency.toLowerCase();
    const key = `${donorName.toLowerCase()}:${email}:${currency}`;
    const amount = charge.amount_captured || charge.amount;
    const donatedAt = new Date(charge.created * 1000).toISOString();
    const current = donors.get(key);
    if (current) {
      current.amount_cents += amount;
      current.charge_count += 1;
      if (!current.name) current.name = donorName;
      if (!current.stripe_customer_id && charge.customer) current.stripe_customer_id = charge.customer;
      if (!current.last_donation_at || current.last_donation_at < donatedAt) current.last_donation_at = donatedAt;
      continue;
    }
    donors.set(key, {
      stripe_customer_id: charge.customer || null,
      name: donorName,
      email,
      currency,
      amount_cents: amount,
      charge_count: 1,
      last_donation_at: donatedAt
    });
  }

  return Array.from(donors.values());
}

function isSuccessfulDonationCharge(charge: StripeCharge) {
  return charge.status === "succeeded" && charge.paid !== false && !charge.refunded && charge.amount > 0;
}
