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
