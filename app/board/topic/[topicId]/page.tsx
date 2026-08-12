import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { createBoardReply, updateBoardPost, updateBoardTopic } from "@/lib/actions/board";
import { getCurrentProfile } from "@/lib/auth";
import { getBoardTopic } from "@/lib/server/board";

export default async function BoardTopicPage({
  params,
  searchParams
}: {
  params: Promise<{ topicId: string }>;
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { topicId } = await params;
  const topic = await getBoardTopic(topicId);
  if (!topic) notFound();
  const pageParams = await searchParams;
  const isAdmin = profile.role === "ADMIN";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link href={"/board" as Route} className="focus-ring text-spruce underline underline-offset-4">
              Captain Board
            </Link>
            <span className="text-ink/40">/</span>
            <Link href={`/board/${topic.category.slug}` as Route} className="focus-ring text-spruce underline underline-offset-4">
              {topic.category.name}
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-bold">{topic.title}</h1>
          <p className="mt-2 text-sm text-ink/65">
            Started by {displayName(topic.author)} · {formatDate(topic.created_at)}
          </p>
        </div>
        <Link href="/dashboard" className="focus-ring rounded-md border border-line bg-white px-4 py-2 font-semibold">
          Dashboard
        </Link>
      </div>

      {pageParams?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{pageParams.message}</p> : null}
      {pageParams?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{pageParams.error}</p> : null}

      {isAdmin ? (
        <form action={updateBoardTopic} className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white p-4">
          <input type="hidden" name="topicId" value={topic.id} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="pinned" type="checkbox" value="yes" defaultChecked={topic.pinned} className="h-4 w-4" />
            Pinned
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="locked" type="checkbox" value="yes" defaultChecked={topic.locked} className="h-4 w-4" />
            Locked
          </label>
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Update</button>
        </form>
      ) : null}

      <section className="mt-6 space-y-4">
        {topic.posts.map((post, index) => (
          <article
            key={post.id}
            className={`rounded-lg border p-5 ${post.hidden_at ? "border-rose/30 bg-rose/5" : "border-line bg-white"}`}
          >
            <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">
                  {displayName(post.author)}
                  {post.hidden_at ? <span className="ml-2 text-sm font-medium text-rose">Hidden</span> : null}
                </p>
                <p className="text-xs text-ink/55">{index === 0 ? "Original post" : "Reply"} · {formatDate(post.created_at)}</p>
              </div>
              {isAdmin ? (
                <form action={updateBoardPost}>
                  <input type="hidden" name="topicId" value={topic.id} />
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="hidden" value={post.hidden_at ? "no" : "yes"} />
                  <button className="focus-ring rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold">
                    {post.hidden_at ? "Restore" : "Hide"}
                  </button>
                </form>
              ) : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{post.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        {topic.locked ? (
          <p className="text-sm font-medium text-ink/65">This topic is locked.</p>
        ) : (
          <form action={createBoardReply} className="space-y-4">
            <input type="hidden" name="topicId" value={topic.id} />
            <h2 className="text-xl font-semibold">Reply</h2>
            <label className="block">
              <span className="text-sm font-medium">Message</span>
              <textarea
                name="body"
                rows={6}
                required
                maxLength={5000}
                className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
              />
            </label>
            <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Post reply</button>
          </form>
        )}
      </section>
    </main>
  );
}

function displayName(profile: { name: string | null; email: string | null } | null) {
  return profile?.name || profile?.email || "Captain";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
