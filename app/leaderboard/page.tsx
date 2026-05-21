import { getLeaderboard } from "@/lib/queries";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Captain leaderboard</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Board title="All-time top captains" rows={leaderboard.allTime} />
        <Board title="Top captains last 7 days" rows={leaderboard.last7Days} />
      </div>
    </main>
  );
}

function Board({ title, rows }: { title: string; rows: Array<{ captain_id: string; captain_name: string; count: number }> }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <h2 className="border-b border-line p-4 text-xl font-semibold">{title}</h2>
      <ol>
        {rows.map((row, index) => (
          <li key={row.captain_id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
            <span className="font-medium">{index + 1}. {row.captain_name}</span>
            <span className="rounded-full bg-field px-3 py-1 text-sm font-semibold">{row.count}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-8 text-center text-ink/60">No accepted referrals yet.</li> : null}
      </ol>
    </section>
  );
}
