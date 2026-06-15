import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractCaptainAlias, splitReplyText, verifyResendWebhook } from "@/lib/server/captain-replies";

afterEach(() => {
  vi.useRealTimers();
});

describe("captain reply aliases", () => {
  it("extracts captain aliases from the join reply-to domain", () => {
    expect(extractCaptainAlias(["Updates <updates+cpt_abc123@join.albertasvoice.ca>"])).toBe("cpt_abc123");
    expect(extractCaptainAlias(["updates+cpt_abc123@example.test"])).toBeNull();
  });
});

describe("Resend webhook verification", () => {
  it("verifies a signed webhook payload", () => {
    vi.setSystemTime(new Date("2026-06-07T18:00:00Z"));
    const payload = JSON.stringify({ type: "email.received", data: { email_id: "email-id" } });
    const secretBytes = crypto.randomBytes(32);
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const headers = {
      id: "msg_test",
      timestamp: String(Math.floor(Date.now() / 1000)),
      signature: ""
    };
    const signature = crypto
      .createHmac("sha256", secretBytes)
      .update(`${headers.id}.${headers.timestamp}.${payload}`)
      .digest("base64");

    headers.signature = `v1,${signature}`;

    expect(verifyResendWebhook(payload, headers, secret)).toEqual({
      type: "email.received",
      data: { email_id: "email-id" }
    });
  });
});

describe("captain reply body splitting", () => {
  it("separates Gmail quoted original messages", () => {
    const body = `testing a reply to captain

On Mon, Jun 15, 2026 at 12:50 PM Stephen Elas on behalf of Alberta's
Voice <updates+cpt_f23b@join.albertasvoice.ca> wrote:

> [image: Alberta's Voice] Alberta's Voice
> A Voice for Every Albertan
> Original campaign message`;

    expect(splitReplyText(body)).toEqual({
      visibleText: "testing a reply to captain",
      quotedText: `On Mon, Jun 15, 2026 at 12:50 PM Stephen Elas on behalf of Alberta's
Voice <updates+cpt_f23b@join.albertasvoice.ca> wrote:

> [image: Alberta's Voice] Alberta's Voice
> A Voice for Every Albertan
> Original campaign message`
    });
  });

  it("separates quote-only blocks without a wrote header", () => {
    const body = `Fresh reply line

> Prior message line
> Prior message line 2`;

    expect(splitReplyText(body)).toEqual({
      visibleText: "Fresh reply line",
      quotedText: `> Prior message line
> Prior message line 2`
    });
  });
});
