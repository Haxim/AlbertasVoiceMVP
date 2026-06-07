import { describe, expect, it } from "vitest";
import { personalizeBroadcastBody, personalizeCaptainBroadcastBody } from "@/lib/server/admin";

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
});
