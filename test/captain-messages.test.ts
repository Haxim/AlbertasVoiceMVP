import { describe, expect, it } from "vitest";
import { personalizeCaptainMessageBody } from "@/lib/server/captain-messages";

describe("captain direct message personalization", () => {
  it("replaces placeholders with the subscriber and captain names", () => {
    const body = personalizeCaptainMessageBody(
      "Hi [name], from [captain]. Reply to [captain].",
      { name: "Subscriber One" },
      { name: "Captain One", email: "captain@example.test" }
    );

    expect(body).toBe("Hi Subscriber One, from Captain One. Reply to Captain One.");
  });

  it("defaults missing placeholder values", () => {
    const body = personalizeCaptainMessageBody("Hi [name], from [captain].", { name: " " }, { name: " ", email: null });

    expect(body).toBe("Hi friend, from Alberta's Voice.");
  });
});
