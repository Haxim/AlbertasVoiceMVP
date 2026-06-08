import { describe, expect, it } from "vitest";
import { acceptInviteSchema } from "@/lib/validation";

describe("invite acceptance validation", () => {
  it("requires explicit consent before opt-in", () => {
    const result = acceptInviteSchema.safeParse({
      token: "abcdefghijklmnopqrstuvwxyz",
      preference: "ALL_UPDATES"
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid preference with consent", () => {
    const result = acceptInviteSchema.safeParse({
      token: "abcdefghijklmnopqrstuvwxyz",
      preference: "VOTE_REMINDER_ONLY",
      consent: "yes",
      captainEmailConsent: true
    });
    expect(result.success).toBe(true);
  });
});
