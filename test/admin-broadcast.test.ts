import { describe, expect, it } from "vitest";
import { buildCaptainSignupReportRows, personalizeBroadcastBody, personalizeCaptainBroadcastBody } from "@/lib/server/admin";

describe("broadcast body personalization", () => {
  it("replaces placeholders with the subscriber and captain names", () => {
    const body = personalizeBroadcastBody("Hi [name], from [captain]. Reply to [captain].", {
      name: "Subscriber One",
      profiles: { name: "Captain One" }
    });

    expect(body).toBe("Hi Subscriber One, from Captain One. Reply to Captain One.");
  });

  it("defaults missing placeholder values", () => {
    const body = personalizeBroadcastBody("Hi [name], from [captain].", {
      name: " ",
      profiles: null
    });

    expect(body).toBe("Hi friend, from Alberta's Voice.");
  });

  it("uses the captain name for captain-only broadcast placeholders", () => {
    const body = personalizeCaptainBroadcastBody("Hi [name], this is for [captain].", {
      name: "Captain One",
      email: "captain@example.test"
    });

    expect(body).toBe("Hi Captain One, this is for Captain One.");
  });

  it("builds captain signup report rows with thresholds and active counts", () => {
    const rows = buildCaptainSignupReportRows(
      [
        {
          captain_id: "captain-a",
          consented_at: "2026-05-01T12:00:00Z",
          unsubscribed_at: null,
          profiles: { name: "Captain A", email: "a@example.test" }
        },
        {
          captain_id: "captain-a",
          consented_at: "2026-05-02T12:00:00Z",
          unsubscribed_at: "2026-05-03T12:00:00Z",
          profiles: { name: "Captain A", email: "a@example.test" }
        },
        {
          captain_id: "captain-b",
          consented_at: "2026-05-04T12:00:00Z",
          unsubscribed_at: null,
          profiles: { name: "Captain B", email: "b@example.test" }
        }
      ],
      2
    );

    expect(rows).toEqual([
      {
        captainId: "captain-a",
        captainName: "Captain A",
        captainEmail: "a@example.test",
        verifiedSignups: 2,
        activeContacts: 1,
        firstSignupAt: "2026-05-01T12:00:00Z",
        lastSignupAt: "2026-05-02T12:00:00Z"
      }
    ]);
  });
});
