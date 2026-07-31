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
  donor_key: string;
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
    .select("id,donor_key,stripe_customer_id,name,email,currency,amount_cents,charge_count,last_donation_at,thank_you_sent_at,synced_at")
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
  const existingEmails = await getExistingDonorEmails(donors);
  const { error } = await service.from("stripe_donors").upsert(
    donors.map((donor) => ({
      ...donor,
      email: existingEmails.get(`${donor.donor_key}:${donor.currency}`) || donor.email,
      synced_at: now,
      updated_at: now
    })),
    { onConflict: "donor_key,currency" }
  );
  if (error) throw error;
  return { synced: donors.length, scanned: charges.length };
}

async function getExistingDonorEmails(donors: Array<{ donor_key: string; currency: string }>) {
  const existingEmails = new Map<string, string>();
  if (!donors.length) return existingEmails;

  const service = createServiceClient();
  const { data, error } = await service
    .from("stripe_donors")
    .select("donor_key,currency,email")
    .in("donor_key", Array.from(new Set(donors.map((donor) => donor.donor_key))));
  if (error) throw error;

  for (const row of data || []) {
    if (row.donor_key && row.currency && row.email) {
      existingEmails.set(`${row.donor_key}:${row.currency}`, row.email);
    }
  }
  return existingEmails;
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
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
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
    donor_key: string;
    stripe_customer_id: string | null;
    name: string | null;
    email: string;
    currency: string;
    amount_cents: number;
    charge_count: number;
    last_donation_at: string | null;
    best_email_amount_cents: number;
  }>();

  for (const charge of charges) {
    if (!isSuccessfulDonationCharge(charge)) continue;
    const email = (charge.billing_details?.email || charge.receipt_email || "").trim().toLowerCase();
    const donorName = charge.shipping?.name?.trim();
    const donorKey = donorKeyForCharge(charge);
    if (!email || !donorName || !donorKey) continue;
    const currency = charge.currency.toLowerCase();
    const key = `${donorKey}:${currency}`;
    const amount = charge.amount_captured || charge.amount;
    const donatedAt = new Date(charge.created * 1000).toISOString();
    const current = donors.get(key);
    if (current) {
      current.amount_cents += amount;
      current.charge_count += 1;
      if (!current.name) current.name = donorName;
      if (amount > current.best_email_amount_cents) {
        current.email = email;
        current.stripe_customer_id = charge.customer || null;
        current.best_email_amount_cents = amount;
      } else if (!current.stripe_customer_id && charge.customer) {
        current.stripe_customer_id = charge.customer;
      }
      if (!current.last_donation_at || current.last_donation_at < donatedAt) current.last_donation_at = donatedAt;
      continue;
    }
    donors.set(key, {
      donor_key: donorKey,
      stripe_customer_id: charge.customer || null,
      name: donorName,
      email,
      currency,
      amount_cents: amount,
      charge_count: 1,
      last_donation_at: donatedAt,
      best_email_amount_cents: amount
    });
  }

  return Array.from(donors.values()).map(({ best_email_amount_cents, ...donor }) => donor);
}

function isSuccessfulDonationCharge(charge: StripeCharge) {
  return charge.status === "succeeded" && charge.paid !== false && !charge.refunded && charge.amount > 0;
}

function donorKeyForCharge(charge: StripeCharge) {
  const shipping = charge.shipping;
  const address = shipping?.address;
  const parts = [
    shipping?.name,
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.postal_code,
    address?.country
  ].map(normalizeIdentityPart);
  if (parts.some((part, index) => index !== 2 && !part)) return null;
  return parts.join("|");
}

function normalizeIdentityPart(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
