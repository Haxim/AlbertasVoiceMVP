import { describe, expect, it } from "vitest";
import {
  captainCanAccessInvite,
  captainCanAccessRowForInvite,
  filterSubscribersByPreference,
  hasDuplicateActiveContact,
  isSuppressed
} from "@/lib/rules";
import { normalizeEmail, normalizePhone } from "@/lib/normalization";

describe("referral rules", () => {
  it("prevents duplicate active invites by normalized phone or email", () => {
    const candidate = { normalized_email: normalizeEmail(" PERSON@Example.COM "), normalized_phone: normalizePhone("(780) 555-0100") };
    const duplicate = hasDuplicateActiveContact(
      candidate,
      [{ normalized_email: "person@example.com", normalized_phone: null, status: "PENDING" }],
      []
    );
    expect(duplicate).toBe(true);
  });

  it("does not block declined historical invites", () => {
    const duplicate = hasDuplicateActiveContact(
      { normalized_email: "person@example.com" },
      [{ normalized_email: "person@example.com", status: "DECLINED" }],
      []
    );
    expect(duplicate).toBe(false);
  });

  it("filters accepted subscribers by broadcast preference and excludes unsubscribed rows", () => {
    const rows = [
      { preference: "ALL_UPDATES" as const, unsubscribed_at: null },
      { preference: "WEEKLY_DIGEST" as const, unsubscribed_at: null },
      { preference: "VOTE_REMINDER_ONLY" as const, unsubscribed_at: null },
      { preference: "WEEKLY_DIGEST" as const, unsubscribed_at: "2026-05-21T00:00:00Z" }
    ];
    expect(filterSubscribersByPreference(rows, "ALL_UPDATES")).toHaveLength(1);
    expect(filterSubscribersByPreference(rows, "WEEKLY_DIGEST")).toHaveLength(2);
    expect(filterSubscribersByPreference(rows, "VOTE_REMINDER_ONLY")).toHaveLength(3);
    expect(filterSubscribersByPreference(rows, "ALL")).toHaveLength(3);
  });

  it("enforces captain access restrictions", () => {
    expect(captainCanAccessInvite("captain-a", { captain_id: "captain-a" })).toBe(true);
    expect(captainCanAccessInvite("captain-a", { captain_id: "captain-b" })).toBe(false);
  });

  it("limits related subscriber and consent rows to the inviting captain", () => {
    const invites = [
      { id: "invite-a", captain_id: "captain-a" },
      { id: "invite-b", captain_id: "captain-b" }
    ];
    expect(captainCanAccessRowForInvite("captain-a", { invite_id: "invite-a" }, invites)).toBe(true);
    expect(captainCanAccessRowForInvite("captain-a", { invite_id: "invite-b" }, invites)).toBe(false);
    expect(captainCanAccessRowForInvite("captain-a", { invite_id: null }, invites)).toBe(false);
  });

  it("blocks suppressed contacts", () => {
    expect(isSuppressed({ normalized_phone: "+17805550100" }, [{ normalized_phone: "+17805550100" }])).toBe(true);
  });
});
