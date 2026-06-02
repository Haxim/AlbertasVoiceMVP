import { beforeEach, describe, expect, it, vi } from "vitest";

const { runtimeEnvMock } = vi.hoisted(() => ({
  runtimeEnvMock: vi.fn()
}));

vi.mock("@/lib/runtime-env", () => ({
  runtimeEnv: runtimeEnvMock
}));

import { sendEmail, sendEmailBatch } from "@/lib/email";

describe("sendEmail", () => {
  beforeEach(() => {
    runtimeEnvMock.mockImplementation(async (name: string) => {
      const values: Record<string, string> = {
        RESEND_API_KEY: "resend-api-key",
        BROADCAST_FROM_EMAIL: "broadcast@example.test",
        INVITE_FROM_EMAIL: "invite@example.test"
      };
      return values[name];
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "email-id" }), { status: 200 }))
    );
  });

  it("uses the requested broadcast sender when both sender variables exist", async () => {
    await sendEmail({
      to: "subscriber@example.test",
      subject: "Campaign update",
      text: "Hello",
      fromEmailEnv: "BROADCAST_FROM_EMAIL"
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.from).toBe("\"Alberta's Voice\" <broadcast@example.test>");
  });

  it("uses the requested invitation sender when both sender variables exist", async () => {
    await sendEmail({
      to: "invitee@example.test",
      subject: "Invitation",
      text: "Hello",
      fromEmailEnv: "INVITE_FROM_EMAIL"
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.from).toBe("\"Alberta's Voice\" <invite@example.test>");
  });

  it("passes an idempotency key to Resend when provided", async () => {
    await sendEmail({
      to: "subscriber@example.test",
      subject: "Campaign update",
      text: "Hello",
      fromEmailEnv: "BROADCAST_FROM_EMAIL",
      idempotencyKey: "broadcast/example/subscriber/example"
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("idempotency-key")).toBe("broadcast/example/subscriber/example");
  });

  it("sends a personalized batch with an idempotency key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: [{ id: "email-1" }, { id: "email-2" }] }), { status: 200 }))
    );

    const ids = await sendEmailBatch({
      emails: [
        { to: "one@example.test", subject: "Update", text: "Hello one", fromName: "Captain One" },
        { to: "two@example.test", subject: "Update", text: "Hello two", fromName: "Captain Two" }
      ],
      fromEmailEnv: "BROADCAST_FROM_EMAIL",
      idempotencyKey: "broadcast/example/batch/example"
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(new Headers(init?.headers).get("idempotency-key")).toBe("broadcast/example/batch/example");
    expect(payload[0].from).toBe('"Captain One" <broadcast@example.test>');
    expect(ids).toEqual(["email-1", "email-2"]);
  });
});
