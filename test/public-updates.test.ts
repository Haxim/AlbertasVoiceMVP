import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock, runtimeEnvMock, createServiceClientMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  runtimeEnvMock: vi.fn(),
  createServiceClientMock: vi.fn()
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock
}));

vi.mock("@/lib/runtime-env", () => ({
  runtimeEnv: runtimeEnvMock
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: createServiceClientMock
}));

import { confirmPublicUpdatesSignup, startPublicUpdatesSignup } from "@/lib/server/public-updates";

describe("public updates signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeEnvMock.mockImplementation(async (name: string) => {
      const values: Record<string, string> = {
        BROADCAST_FROM_EMAIL: "updates@example.test"
      };
      return values[name];
    });
    sendEmailMock.mockResolvedValue("email-id");
  });

  it("creates a pending subscriber and sends a verification email", async () => {
    const insertPayloads: Array<Record<string, unknown>> = [];
    createServiceClientMock.mockReturnValue({
      from(table: string) {
        if (table === "suppression_list") {
          return {
            select: () => ({
              eq: async () => ({ data: [], error: null })
            })
          };
        }
        if (table === "subscribers") {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null })
                  })
                })
              })
            }),
            insert: (payload: Record<string, unknown>) => {
              insertPayloads.push(payload);
              return {
                select: () => ({
                  single: async () => ({ data: { id: "subscriber-id" }, error: null })
                })
              };
            }
          };
        }
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            return { error: null };
          }
        };
      }
    });

    const result = await startPublicUpdatesSignup(
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ADA@example.test",
        origin: "https://join.example.test"
      },
      { ip: "127.0.0.1", userAgent: "vitest" }
    );

    expect(result).toEqual({ alreadySubscribed: false });
    expect(insertPayloads[0]).toMatchObject({
      name: "Ada Lovelace",
      email: "ADA@example.test",
      normalized_email: "ada@example.test",
      email_consent: false,
      consented_at: null,
      preference: "ALL_UPDATES"
    });
    expect(insertPayloads[0].email_verification_token_hash).toEqual(expect.any(String));
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ADA@example.test",
        subject: "Confirm your Alberta's Voice updates signup",
        text: expect.stringContaining("https://join.example.test/api/verify-subscription?token=")
      })
    );
  });

  it("confirms a pending subscriber when the verification token matches", async () => {
    const updates: Array<Record<string, unknown>> = [];
    createServiceClientMock.mockReturnValue({
      from(table: string) {
        if (table === "subscribers") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: "subscriber-id",
                        invite_id: null,
                        normalized_email: "ada@example.test",
                        email_verification_expires_at: new Date(Date.now() + 60_000).toISOString(),
                        unsubscribed_at: null
                      },
                      error: null
                    })
                  })
                })
              })
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: async () => {
                updates.push(payload);
                return { error: null };
              }
            })
          };
        }
        if (table === "suppression_list") {
          return {
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: null })
              })
            })
          };
        }
        return {
          insert: async () => ({ error: null })
        };
      }
    });

    await expect(confirmPublicUpdatesSignup("verification-token")).resolves.toBe("confirmed");
    expect(updates[0]).toMatchObject({
      email_consent: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      unsubscribed_at: null
    });
    expect(updates[0].consented_at).toEqual(expect.any(String));
    expect(updates[0].email_verified_at).toEqual(expect.any(String));
  });
});
