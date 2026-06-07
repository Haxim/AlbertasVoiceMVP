import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <main>
        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-petal">A voice for every Albertan</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Help build Alberta&apos;s Voice, one neighbour at a time.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
              We are recruiting a grassroots community of Albertans who want this province to stay in Canada, stand up
              for constitutional democracy, and welcome the people who help Alberta grow.
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/75">
              Captains are local connectors. They reach out to people they know, invite them into the campaign, and help
              turn private concern into public momentum.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="focus-ring rounded-md bg-spruce px-5 py-3 text-center font-semibold text-white">
                Join as a captain
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm shadow-sky/10">
            <div className="flex items-center gap-4 border-b border-line pb-5">
              <img src="/icon.png" alt="Alberta's Voice icon" className="h-20 w-20 rounded-xl" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Alberta&apos;s Voice</p>
                <h2 className="text-xl font-semibold">What captains do</h2>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Start with your circle", "Invite friends, neighbours, coworkers, and family who care about Alberta's future."],
                ["Grow the community", "Help new supporters hear from Alberta's Voice and take the next useful step."],
                ["Keep it local", "Build momentum through trusted conversations in the places Albertans already gather."]
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
      <footer className="border-t border-white/20 bg-[#003754] px-4 py-9 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <strong className="text-lg text-white">Alberta&apos;s Voice</strong>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Say No to the Nine. Stay in Canada. <strong>#ABVoice</strong>
            </p>
          </div>
          <div className="space-y-1 text-sm leading-6 text-white/75 md:max-w-2xl">
            <p>Authorized by Alberta&apos;s Voice, Referendum Third Party Advertiser.</p>
            <p className="mt-2">
              Contact:{" "}
              <a className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white" href="https://albertasvoice.ca">
                albertasvoice.ca
              </a>
            </p>
            <p>We support Alberta remaining in Canada.</p>
            <p>We oppose the other nine referendum questions.</p>
            <p>(Required by Elections Alberta. We didn&apos;t write the rules. The Government of Alberta did.)</p>
            <p>
              For our full TPA compliance statement, visit{" "}
              <a
                className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
                href="https://albertasvoice.ca/disclaimer"
              >
                albertasvoice.ca/disclaimer
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
