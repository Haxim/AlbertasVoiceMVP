import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type ThankYouEmailLogRow = {
  id: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  provider_message_id: string | null;
  sender?: { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null;
};

export async function logThankYouEmailSent({
  sender,
  recipientEmail,
  subject,
  providerMessageId
}: {
  sender: Profile;
  recipientEmail: string;
  subject: string;
  providerMessageId: string | null;
}) {
  const service = createServiceClient();
  const { error } = await service.from("thank_you_emails").insert({
    sender_id: sender.id,
    recipient_email: recipientEmail,
    subject,
    provider_message_id: providerMessageId
  });
  if (error) throw error;
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
