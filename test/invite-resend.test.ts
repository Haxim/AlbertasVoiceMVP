import { describe, expect, it } from "vitest";
import { getInviteEmailResendAvailability } from "@/lib/server/invites";
import { resendInviteSchema } from "@/lib/validation";

describe("invite email resend", () => {
  it("allows resending when there is no previous email timestamp", () => {
    expect(getInviteEmailResendAvailability(null).canResend).toBe(true);
  });

  it("blocks resending inside the 15 minute cooldown", () => {
    const result = getInviteEmailResendAvailability("2026-07-05T12:00:00.000Z", new Date("2026-07-05T12:05:01.000Z"));

    expect(result.canResend).toBe(false);
    expect(result.remainingMinutes).toBe(10);
  });

  it("allows resending after the 15 minute cooldown", () => {
    const result = getInviteEmailResendAvailability("2026-07-05T12:00:00.000Z", new Date("2026-07-05T12:15:00.000Z"));

    expect(result.canResend).toBe(true);
  });

  it("requires a valid invite id", () => {
    expect(resendInviteSchema.safeParse({ inviteId: "not-an-id" }).success).toBe(false);
    expect(resendInviteSchema.safeParse({ inviteId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });
});
