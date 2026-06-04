import { describe, expect, it } from "vitest";
import { personalizeBroadcastBody } from "@/lib/server/admin";

describe("broadcast body personalization", () => {
  it("replaces captain placeholders with the subscriber captain name", () => {
    const body = personalizeBroadcastBody("Hi from [captain]. Reply to [captain].", {
      profiles: { name: "Captain One" }
    });

    expect(body).toBe("Hi from Captain One. Reply to Captain One.");
  });

  it("defaults captain placeholders to Alberta's Voice", () => {
    const body = personalizeBroadcastBody("Hi from [captain].", {
      profiles: null
    });

    expect(body).toBe("Hi from Alberta's Voice.");
  });
});
