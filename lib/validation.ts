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
  consent: z.literal("yes"),
  captainEmailConsent: z.boolean()
});

export const tokenSchema = z.object({
  token: z.string().min(20)
});

export const resendInviteSchema = z.object({
  inviteId: z.string().uuid()
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
export const adminAudienceSelectionSchema = z.enum(["ALL_UPDATES", "WEEKLY_DIGEST", "VOTE_REMINDER_ONLY", "CAPTAINS", "ALL"]);
export const captainSignupReportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  minSignups: z.coerce.number().int().min(0).max(100000).default(20)
});

export const emailBroadcastSchema = z.object({
  preference: adminAudienceSelectionSchema,
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  confirmConsent: z.literal("yes")
});

export const captainEmailMessageSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  confirmConsent: z.literal("yes")
});
