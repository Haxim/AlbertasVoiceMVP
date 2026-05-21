import { describe, expect, it } from "vitest";
import { captainCanAccessInvite, filterSubscribersByPreference, hasDuplicateActiveContact, isSuppressed } from "@/lib/rules";
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

  it("filters accepted subscribers by preference and excludes unsubscribed rows", () => {
    const rows = [
      { preference: "ALL_UPDATES" as const, unsubscribed_at: null },
      { preference: "WEEKLY_DIGEST" as const, unsubscribed_at: null },
      { preference: "WEEKLY_DIGEST" as const, unsubscribed_at: "2026-05-21T00:00:00Z" }
    ];
    expect(filterSubscribersByPreference(rows, "WEEKLY_DIGEST")).toHaveLength(1);
    expect(filterSubscribersByPreference(rows, "ALL")).toHaveLength(2);
  });

  it("enforces captain access restrictions", () => {
    expect(captainCanAccessInvite("captain-a", { captain_id: "captain-a" })).toBe(true);
    expect(captainCanAccessInvite("captain-a", { captain_id: "captain-b" })).toBe(false);
  });

  it("blocks suppressed contacts", () => {
    expect(isSuppressed({ normalized_phone: "+17805550100" }, [{ normalized_phone: "+17805550100" }])).toBe(true);
  });
});
