"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAdmin, requireCaptain } from "@/lib/auth";
import {
  createBoardReplySchema,
  createBoardTopicSchema,
  updateBoardTopicSchema
} from "@/lib/validation";
import {
  createBoardReply as createBoardReplyServer,
  createBoardTopic as createBoardTopicServer,
  updateBoardTopicModeration
} from "@/lib/server/board";

export async function createBoardTopic(formData: FormData) {
  const captain = await requireCaptain();
  const parsed = createBoardTopicSchema.safeParse({
    categorySlug: formData.get("categorySlug"),
    title: formData.get("title"),
    body: formData.get("body")
  });
  if (!parsed.success) {
    redirect(`/board/${formData.get("categorySlug") || ""}?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid topic.")}` as Route);
  }

  try {
    const topic = await createBoardTopicServer({ author: captain, ...parsed.data });
    redirect(`/board/topic/${topic.id}?message=${encodeURIComponent("Topic posted.")}` as Route);
  } catch (error) {
    redirect(`/board/${parsed.data.categorySlug}?error=${encodeURIComponent(errorMessage(error, "Topic could not be posted."))}` as Route);
  }
}

export async function createBoardReply(formData: FormData) {
  const captain = await requireCaptain();
  const parsed = createBoardReplySchema.safeParse({
    topicId: formData.get("topicId"),
    body: formData.get("body")
  });
  if (!parsed.success) {
    redirect(`/board?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Invalid reply.")}` as Route);
  }

  try {
    await createBoardReplyServer({ author: captain, ...parsed.data });
    redirect(`/board/topic/${parsed.data.topicId}?message=${encodeURIComponent("Reply posted.")}` as Route);
  } catch (error) {
    redirect(`/board/topic/${parsed.data.topicId}?error=${encodeURIComponent(errorMessage(error, "Reply could not be posted."))}` as Route);
  }
}

export async function updateBoardTopic(formData: FormData) {
  await requireAdmin();
  const parsed = updateBoardTopicSchema.safeParse({
    topicId: formData.get("topicId"),
    pinned: formData.get("pinned") === "yes",
    locked: formData.get("locked") === "yes"
  });
  if (!parsed.success) redirect("/board?error=Invalid%20topic." as Route);

  try {
    await updateBoardTopicModeration(parsed.data);
    redirect(`/board/topic/${parsed.data.topicId}?message=${encodeURIComponent("Topic updated.")}` as Route);
  } catch (error) {
    redirect(`/board/topic/${parsed.data.topicId}?error=${encodeURIComponent(errorMessage(error, "Topic could not be updated."))}` as Route);
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
