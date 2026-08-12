"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAdmin, requireCaptain } from "@/lib/auth";
import {
  createBoardReplySchema,
  createBoardTopicSchema,
  updateBoardPostVisibilitySchema,
  updateBoardTopicSchema
} from "@/lib/validation";
import {
  createBoardReply as createBoardReplyServer,
  createBoardTopic as createBoardTopicServer,
  updateBoardPostVisibility,
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

  let topicId = "";
  try {
    const topic = await createBoardTopicServer({ author: captain, ...parsed.data });
    topicId = topic.id;
  } catch (error) {
    redirect(`/board/${parsed.data.categorySlug}?error=${encodeURIComponent(errorMessage(error, "Topic could not be posted."))}` as Route);
  }
  redirect(`/board/topic/${topicId}?message=${encodeURIComponent("Topic posted.")}` as Route);
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
  } catch (error) {
    redirect(`/board/topic/${parsed.data.topicId}?error=${encodeURIComponent(errorMessage(error, "Reply could not be posted."))}` as Route);
  }
  redirect(`/board/topic/${parsed.data.topicId}?message=${encodeURIComponent("Reply posted.")}` as Route);
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
  } catch (error) {
    redirect(`/board/topic/${parsed.data.topicId}?error=${encodeURIComponent(errorMessage(error, "Topic could not be updated."))}` as Route);
  }
  redirect(`/board/topic/${parsed.data.topicId}?message=${encodeURIComponent("Topic updated.")}` as Route);
}

export async function updateBoardPost(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = updateBoardPostVisibilitySchema.safeParse({
    topicId: formData.get("topicId"),
    postId: formData.get("postId"),
    hidden: formData.get("hidden") === "yes"
  });
  if (!parsed.success) redirect("/board?error=Invalid%20post." as Route);

  try {
    await updateBoardPostVisibility({ admin, postId: parsed.data.postId, hidden: parsed.data.hidden });
  } catch (error) {
    redirect(`/board/topic/${parsed.data.topicId}?error=${encodeURIComponent(errorMessage(error, "Post could not be updated."))}` as Route);
  }
  redirect(`/board/topic/${parsed.data.topicId}?message=${encodeURIComponent(parsed.data.hidden ? "Post hidden." : "Post restored.")}` as Route);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
