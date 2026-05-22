import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-petal">Consent-first referrals</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Invite Albertans to opt in, clearly and voluntarily.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            Captains can send one invitation to a friend or neighbour. Recipients choose whether they want updates, a
            digest, a vote reminder, or no messages at all.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="focus-ring rounded-md bg-spruce px-5 py-3 text-center font-semibold text-white">
              Become a captain
            </Link>
            <Link href="/leaderboard" className="focus-ring rounded-md border border-line bg-white px-5 py-3 text-center font-semibold">
              See leaderboard
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-5 shadow-sm shadow-sky/10">
          <div className="flex items-center gap-4 border-b border-line pb-5">
            <img src="/icon.png" alt="Alberta's Voice icon" className="h-20 w-20 rounded-xl" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Alberta&apos;s Voice</p>
              <h2 className="text-xl font-semibold">How the MVP works</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ["Captain invites", "A volunteer enters a name and phone or email."],
              ["Recipient decides", "The link opens a consent page with clear choices."],
              ["Only opt-ins continue", "No updates are sent unless the recipient explicitly consents."]
            ].map(([title, body]) => (
              <div key={title} className="border-l-4 border-gold pl-4">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
