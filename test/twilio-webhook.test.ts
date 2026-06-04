import { describe, expect, it, vi } from "vitest";
import { handleTwilioWebhook, twilioSignature } from "@/lib/actions/twilio";

vi.mock("@/lib/runtime-env", () => ({
  runtimeEnv: vi.fn(async (name: string) => (name === "TWILIO_AUTH_TOKEN" ? "test-token" : undefined))
}));

vi.mock("@/lib/server/invites", () => ({
  unsubscribePhone: vi.fn()
}));

describe("Twilio webhook security", () => {
  it("rejects unsigned webhook requests", async () => {
    const response = await handleTwilioWebhook(
      new Request("https://example.test/api/twilio/webhook", {
        method: "POST",
        body: new URLSearchParams({ Body: "STOP", From: "+17805550100" })
      })
    );

    expect(response.status).toBe(403);
  });

  it("accepts valid Twilio signatures", async () => {
    const formData = new FormData();
    formData.set("Body", "STOP");
    formData.set("From", "+17805550100");
    const url = "https://example.test/api/twilio/webhook";
    const signature = twilioSignature(url, formData, "test-token");

    const response = await handleTwilioWebhook(
      new Request(url, {
        method: "POST",
        headers: { "x-twilio-signature": signature },
        body: new URLSearchParams({ Body: "STOP", From: "+17805550100" })
      })
    );

    expect(response.status).toBe(200);
  });
});
