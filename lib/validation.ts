import { z } from "zod";

export const createInviteSchema = z
  .object({
    inviteeName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().min(7).max(40).optional().or(z.literal("")),
    nameUseConsent: z.literal("yes")
  })
  .refine((data) => Boolean(data.email), {
    message: "Add an email.",
    path: ["email"]
  });

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  preference: z.enum(["ALL_UPDATES", "WEEKLY_DIGEST", "VOTE_REMINDER_ONLY"]),
  consent: z.literal("yes")
});

export const tokenSchema = z.object({
  token: z.string().min(20)
});

export const subscriptionTokenSchema = z.object({
  token: z.string().min(20)
});

export const updateSubscriptionSchema = z.object({
  token: z.string().min(20),
  preference: z.enum(["ALL_UPDATES", "WEEKLY_DIGEST", "VOTE_REMINDER_ONLY"]),
  captainEmailConsent: z.boolean()
});

export const preferenceFilterSchema = z.enum(["ALL", "ALL_UPDATES", "WEEKLY_DIGEST", "VOTE_REMINDER_ONLY"]);
export const broadcastAudienceSchema = z.enum(["SUBSCRIBERS", "CAPTAINS"]);

export const emailBroadcastSchema = z.object({
  audience: broadcastAudienceSchema,
  preference: preferenceFilterSchema,
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  confirmConsent: z.literal("yes")
});

export const captainEmailMessageSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  confirmConsent: z.literal("yes")
});
