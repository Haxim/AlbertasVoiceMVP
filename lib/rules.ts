import type { InviteStatus, Preference, PreferenceFilter } from "@/lib/types";

export type ExistingContactRecord = {
  normalized_email?: string | null;
  normalized_phone?: string | null;
  status?: InviteStatus;
  unsubscribed_at?: string | null;
};

export function hasDuplicateActiveContact(
  candidate: { normalized_email?: string | null; normalized_phone?: string | null },
  invites: ExistingContactRecord[],
  subscribers: ExistingContactRecord[]
) {
  const email = candidate.normalized_email;
  const phone = candidate.normalized_phone;
  const activeInviteStatuses: InviteStatus[] = ["PENDING", "ACCEPTED"];

  return (
    invites.some(
      (invite) =>
        activeInviteStatuses.includes(invite.status || "PENDING") &&
        ((email && invite.normalized_email === email) || (phone && invite.normalized_phone === phone))
    ) ||
    subscribers.some(
      (subscriber) =>
        !subscriber.unsubscribed_at &&
        ((email && subscriber.normalized_email === email) || (phone && subscriber.normalized_phone === phone))
    )
  );
}

export function isSuppressed(
  candidate: { normalized_email?: string | null; normalized_phone?: string | null },
  suppressed: Array<{ normalized_email?: string | null; normalized_phone?: string | null }>
) {
  return suppressed.some(
    (row) =>
      (candidate.normalized_email && row.normalized_email === candidate.normalized_email) ||
      (candidate.normalized_phone && row.normalized_phone === candidate.normalized_phone)
  );
}

export function filterSubscribersByPreference<T extends { preference: Preference; unsubscribed_at?: string | null }>(
  rows: T[],
  preference: PreferenceFilter
) {
  return rows.filter((row) => !row.unsubscribed_at && (preference === "ALL" || row.preference === preference));
}

export function captainCanAccessInvite(captainId: string, invite: { captain_id: string }) {
  return invite.captain_id === captainId;
}

export function captainCanAccessRowForInvite(
  captainId: string,
  row: { invite_id?: string | null },
  invites: Array<{ id: string; captain_id: string }>
) {
  if (!row.invite_id) return false;
  return invites.some((invite) => invite.id === row.invite_id && invite.captain_id === captainId);
}
