import { createServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmailBatch } from "@/lib/email";
import type { BoardCategory, BoardPost, BoardTopic, Profile } from "@/lib/types";

export type BoardCategorySummary = BoardCategory & {
  topicCount: number;
  latestTopic: BoardTopicSummary | null;
};

export type BoardTopicSummary = BoardTopic & {
  category?: Pick<BoardCategory, "name" | "slug">;
  author: Pick<Profile, "id" | "name" | "email"> | null;
  postCount: number;
  replyCount: number;
  latestPostAt: string;
};

export type BoardTopicDetail = BoardTopic & {
  category: BoardCategory;
  author: Pick<Profile, "id" | "name" | "email"> | null;
  posts: BoardPostDetail[];
};

export type BoardPostDetail = BoardPost & {
  author: Pick<Profile, "id" | "name" | "email"> | null;
};

type TopicRow = BoardTopic & {
  board_categories?: Pick<BoardCategory, "name" | "slug"> | null;
  profiles?: Pick<Profile, "id" | "name" | "email"> | null;
  board_posts?: Array<Pick<BoardPost, "id" | "created_at">>;
};

type TopicDetailRow = BoardTopic & {
  board_categories: BoardCategory;
  profiles?: Pick<Profile, "id" | "name" | "email"> | null;
  board_posts?: Array<BoardPost & { profiles?: Pick<Profile, "id" | "name" | "email"> | null }>;
};

export async function listBoardCategories(): Promise<BoardCategorySummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: categories, error } = await supabase
    .from("board_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;

  const summaries = await Promise.all(
    ((categories || []) as BoardCategory[]).map(async (category) => {
      const topics = await listBoardTopicsForCategory(category.slug, 1);
      return {
        ...category,
        topicCount: await countBoardTopics(category.id),
        latestTopic: topics[0] || null
      };
    })
  );
  return summaries;
}

export async function getBoardCategory(slug: string): Promise<BoardCategory | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("board_categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as BoardCategory | null) || null;
}

export async function listBoardTopicsForCategory(slug: string, limit = 100): Promise<BoardTopicSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_topics")
    .select("*, board_categories!inner(name, slug), profiles(id, name, email), board_posts(id, created_at)")
    .eq("board_categories.slug", slug)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as TopicRow[]).map(topicSummaryFromRow);
}

export async function listRecentBoardTopics(limit = 8): Promise<BoardTopicSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_topics")
    .select("*, board_categories(name, slug), profiles(id, name, email), board_posts(id, created_at)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as TopicRow[]).map(topicSummaryFromRow);
}

export async function getBoardTopic(topicId: string): Promise<BoardTopicDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("board_topics")
    .select("*, board_categories(*), profiles(id, name, email), board_posts(*, profiles(id, name, email))")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as TopicDetailRow;
  return {
    ...row,
    category: row.board_categories,
    author: row.profiles || null,
    posts: (row.board_posts || [])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((post) => ({ ...post, author: post.profiles || null }))
  };
}

export async function createBoardTopic({
  author,
  categorySlug,
  title,
  body
}: {
  author: Profile;
  categorySlug: string;
  title: string;
  body: string;
}) {
  const supabase = await createSupabaseServerClient();
  const category = await getBoardCategory(categorySlug);
  if (!category) throw new Error("Board category not found.");

  const { data: topic, error: topicError } = await supabase
    .from("board_topics")
    .insert({ category_id: category.id, author_id: author.id, title })
    .select("*")
    .single();
  if (topicError) throw topicError;

  const { error: postError } = await supabase
    .from("board_posts")
    .insert({ topic_id: topic.id, author_id: author.id, body });
  if (postError) throw postError;

  return topic as BoardTopic;
}

export async function createBoardReply({
  author,
  topicId,
  body
}: {
  author: Profile;
  topicId: string;
  body: string;
}) {
  const topic = await getBoardTopic(topicId);
  if (!topic) throw new Error("Board topic not found.");
  if (topic.locked) throw new Error("This topic is locked.");

  const supabase = await createSupabaseServerClient();
  const { data: post, error } = await supabase
    .from("board_posts")
    .insert({ topic_id: topicId, author_id: author.id, body })
    .select("*")
    .single();
  if (error) throw error;

  await notifyBoardReplyParticipants(topic, author, body, post.id);
  return post as BoardPost;
}

export async function updateBoardTopicModeration({
  topicId,
  pinned,
  locked
}: {
  topicId: string;
  pinned: boolean;
  locked: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("board_topics").update({ pinned, locked }).eq("id", topicId);
  if (error) throw error;
}

async function countBoardTopics(categoryId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("board_topics")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if (error) throw error;
  return count || 0;
}

async function notifyBoardReplyParticipants(
  topic: BoardTopicDetail,
  author: Profile,
  body: string,
  postId: string
) {
  const recipientsById = new Map<string, string>();
  for (const post of topic.posts) {
    if (post.author?.id && post.author.email && post.author.id !== author.id) {
      recipientsById.set(post.author.id, post.author.email);
    }
  }
  if (topic.author?.id && topic.author.email && topic.author.id !== author.id) {
    recipientsById.set(topic.author.id, topic.author.email);
  }
  const recipients = [...recipientsById.values()];
  if (!recipients.length) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://coach.albertasvoice.ca";
  const topicUrl = `${baseUrl}/board/topic/${topic.id}`;
  const authorName = author.name || author.email || "A captain";
  const preview = body.length > 600 ? `${body.slice(0, 600)}...` : body;

  try {
    await sendEmailBatch({
      fromEmailEnv: "BROADCAST_FROM_EMAIL",
      idempotencyKey: `board-reply-${postId}`,
      emails: recipients.map((to) => ({
        to,
        subject: `New reply: ${topic.title}`,
        text: `${authorName} replied on the Captain Board.\n\n${preview}\n\nOpen the topic:\n${topicUrl}`,
        html: `<p><strong>${escapeHtml(authorName)}</strong> replied on the Captain Board.</p><p>${escapeHtml(preview).replace(/\n/g, "<br>")}</p><p><a href="${topicUrl}">Open the topic</a></p>`
      }))
    });
  } catch {
    // Board posting should not fail just because email delivery is temporarily unavailable.
  }
}

function topicSummaryFromRow(row: TopicRow): BoardTopicSummary {
  const posts = row.board_posts || [];
  const latestPostAt = posts.reduce((latest, post) => {
    return new Date(post.created_at).getTime() > new Date(latest).getTime() ? post.created_at : latest;
  }, row.updated_at);
  return {
    ...row,
    category: row.board_categories || undefined,
    author: row.profiles || null,
    postCount: posts.length,
    replyCount: Math.max(0, posts.length - 1),
    latestPostAt
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
