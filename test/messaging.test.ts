import { describe, expect, it, vi } from "vitest";

describe("email broadcast text", () => {
  it("includes a subscription management link", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailBroadcastText } = await import("@/lib/messaging");

    expect(emailBroadcastText("Hello supporters", "token-123")).toContain(
      "https://example.test/subscription/token-123"
    );
  });
});

describe("email broadcast html", () => {
  it("renders markdown inside the Alberta's Voice email template", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailBroadcastHtml } = await import("@/lib/messaging");

    const html = emailBroadcastHtml(
      `# Campaign update

Hello **supporters**.

- Join an event
- Read the [latest explainer](https://albertasvoice.ca/disclaimer)`,
      "token-123"
    );

    expect(html).toContain("https://albertasvoice.ca/assets/logo-email.png");
    expect(html).toContain("<strong>supporters</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain('href="https://albertasvoice.ca/disclaimer"');
    expect(html).toContain("https://example.test/subscription/token-123");
    expect(html).not.toContain("Stay in the Loop");
  });

  it("escapes unsupported html in markdown", async () => {
    const { emailBroadcastHtml } = await import("@/lib/messaging");

    const html = emailBroadcastHtml("<script>alert('nope')</script>", "token-123");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
