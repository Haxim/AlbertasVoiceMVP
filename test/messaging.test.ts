import { describe, expect, it, vi } from "vitest";

describe("email broadcast text", () => {
  it("includes a subscription management link", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailBroadcastText } = await import("@/lib/messaging");

    expect(await emailBroadcastText("Hello supporters", "token-123")).toContain(
      "https://example.test/subscription/token-123"
    );
  });
});

describe("email broadcast html", () => {
  it("renders markdown inside the Alberta's Voice email template", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailBroadcastHtml } = await import("@/lib/messaging");

    const html = await emailBroadcastHtml(
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
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailBroadcastHtml } = await import("@/lib/messaging");

    const html = await emailBroadcastHtml("<script>alert('nope')</script>", "token-123");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("email invite html", () => {
  it("uses the Alberta's Voice email template with an invitation CTA", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailInviteHtml, emailInviteSubject } = await import("@/lib/messaging");

    const html = await emailInviteHtml("Captain One", {
      invitee_name: "Friend <Name>",
      token: "invite-token-123"
    });

    expect(emailInviteSubject("Captain One")).toBe("Captain One invited you to learn more about Alberta's Voice");
    expect(html).toContain("https://albertasvoice.ca/assets/logo-email.png");
    expect(html).toContain("Captain One thought you might be interested");
    expect(html).toContain("encourage Albertans to vote No on the nine referendum questions");
    expect(html).toContain("Friend &lt;Name&gt;");
    expect(html).toContain("Review Invitation");
    expect(html).toContain("https://example.test/invite/invite-token-123");
    expect(html).toContain(
      'choose whether you&#39;d like to receive future emails, <a href="https://example.test/invite/invite-token-123" style="color:#003754;text-decoration:underline;">click here</a>.'
    );
    expect(html).toContain("You are not subscribed to Alberta&#39;s Voice updates.");
    expect(html).not.toContain("Manage Email Preferences");
    expect(html).not.toContain("You are receiving this because you opted in");
  });

});

describe("email invite text", () => {
  it("places the invitation URL directly after click here", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const { emailInviteText } = await import("@/lib/messaging");

    const text = await emailInviteText("Captain One", {
      invitee_name: "Friend",
      token: "invite-token-123"
    });

    expect(text).toContain(
      "choose whether you'd like to receive future emails, click here:\nhttps://example.test/invite/invite-token-123"
    );
  });
});
