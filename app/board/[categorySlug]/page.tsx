import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { createBoardTopic } from "@/lib/actions/board";
import { getCurrentProfile } from "@/lib/auth";
import { getBoardCategory, listBoardTopicsForCategory } from "@/lib/server/board";

export default async function BoardCategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { categorySlug } = await params;
  const category = await getBoardCategory(categorySlug);
  if (!category) notFound();
  const pageParams = await searchParams;
  const topics = await listBoardTopicsForCategory(category.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href={"/board" as Route} className="focus-ring text-sm font-semibold text-spruce underline underline-offset-4">
            Captain Board
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{category.name}</h1>
        </div>
        <Link href="/dashboard" className="focus-ring rounded-md border border-line bg-white px-4 py-2 font-semibold">
          Back to dashboard
        </Link>
      </div>

      {pageParams?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{pageParams.message}</p> : null}
      {pageParams?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{pageParams.error}</p> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line p-5">
            <h2 className="text-xl font-semibold">Topics</h2>
          </div>
          <div className="divide-y divide-line">
            {topics.map((topic) => (
              <Link key={topic.id} href={`/board/topic/${topic.id}` as Route} className="focus-ring block p-5 hover:bg-field/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {topic.pinned ? <span className="mr-2 text-gold">Pinned</span> : null}
                      {topic.locked ? <span className="mr-2 text-ink/45">Locked</span> : null}
                      {topic.title}
                    </p>
                    <p className="mt-1 text-sm text-ink/65">Started by {displayName(topic.author)}</p>
                  </div>
                  <p className="text-sm text-ink/60">
                    {topic.replyCount} {topic.replyCount === 1 ? "reply" : "replies"} · {formatDate(topic.latestPostAt)}
                  </p>
                </div>
              </Link>
            ))}
            {topics.length === 0 ? (
              <p className="p-8 text-center text-ink/60">No topics yet. Start the first one.</p>
            ) : null}
          </div>
        </div>

        <form action={createBoardTopic} className="space-y-4 rounded-lg border border-line bg-white p-5">
          <input type="hidden" name="categorySlug" value={category.slug} />
          <h2 className="text-xl font-semibold">Start a topic</h2>
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input
              name="title"
              required
              maxLength={140}
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Details</span>
            <textarea
              name="body"
              rows={9}
              required
              maxLength={5000}
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">
            Post topic
          </button>
        </form>
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
