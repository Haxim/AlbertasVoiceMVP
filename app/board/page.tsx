import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listBoardCategories, listRecentBoardTopics } from "@/lib/server/board";

export default async function BoardPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [categories, recentTopics] = await Promise.all([listBoardCategories(), listRecentBoardTopics()]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">Captain Board</h1>
          <p className="mt-1 text-ink/70">Post a need, coordinate replies, and keep work organized by area.</p>
        </div>
        <Link href="/dashboard" className="focus-ring rounded-md border border-line bg-white px-4 py-2 font-semibold">
          Back to dashboard
        </Link>
      </div>

      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      {params?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/board/${category.slug}` as Route}
            className="focus-ring rounded-lg border border-line bg-white p-5 shadow-sm shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <span className="rounded-full bg-field px-2.5 py-1 text-xs font-semibold text-ink/70">
                {category.topicCount}
              </span>
            </div>
            <p className="mt-3 min-h-10 text-sm leading-5 text-ink/65">
              {category.latestTopic ? category.latestTopic.title : "No topics yet."}
            </p>
            {category.latestTopic ? (
              <p className="mt-3 text-xs font-medium text-ink/55">
                Updated {formatDate(category.latestTopic.latestPostAt)}
              </p>
            ) : null}
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-semibold">Recent activity</h2>
        </div>
        <div className="divide-y divide-line">
          {recentTopics.map((topic) => (
            <Link key={topic.id} href={`/board/topic/${topic.id}` as Route} className="focus-ring block p-5 hover:bg-field/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {topic.pinned ? <span className="mr-2 text-gold">Pinned</span> : null}
                    {topic.title}
                  </p>
                  <p className="mt-1 text-sm text-ink/65">
                    {topic.category?.name} · {displayName(topic.author)}
                  </p>
                </div>
                <p className="text-sm text-ink/60">
                  {topic.replyCount} {topic.replyCount === 1 ? "reply" : "replies"} · {formatDate(topic.latestPostAt)}
                </p>
              </div>
            </Link>
          ))}
          {recentTopics.length === 0 ? (
            <p className="p-8 text-center text-ink/60">No board activity yet.</p>
          ) : null}
        </div>
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
