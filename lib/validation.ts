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

export const selfReferralInviteSchema = z.object({
  captainId: z.string().uuid(),
  email: z.string().trim().email("Add a valid email address.")
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

export const thankYouEmailSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  donorId: z.string().uuid().optional().or(z.literal("")),
  confirmConsent: z.literal("yes")
});

export const createBoardTopicSchema = z.object({
  categorySlug: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3, "Add a topic title.").max(140, "Keep the title under 140 characters."),
  body: z.string().trim().min(2, "Add a first post.").max(5000, "Keep posts under 5,000 characters.")
});

export const createBoardReplySchema = z.object({
  topicId: z.string().uuid(),
  body: z.string().trim().min(2, "Add a reply.").max(5000, "Keep replies under 5,000 characters.")
});

export const updateBoardTopicSchema = z.object({
  topicId: z.string().uuid(),
  pinned: z.boolean(),
  locked: z.boolean()
});

export const updateBoardPostVisibilitySchema = z.object({
  topicId: z.string().uuid(),
  postId: z.string().uuid(),
  hidden: z.boolean()
});
