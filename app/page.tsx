import Link from "next/link";
import { Turnstile } from "@/components/turnstile";
import { signupForUpdates } from "@/lib/actions/subscriptions";
import { runtimeEnv } from "@/lib/runtime-env";

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; verification?: string }>;
}) {
  const params = await searchParams;
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const statusMessage =
    params?.message ||
    (params?.verification === "confirmed"
      ? "Your email is verified. You are signed up for updates."
      : params?.verification === "invalid"
        ? "This verification link is invalid or has already been used."
        : params?.verification === "expired"
          ? "This verification link has expired. Submit the form again for a new link."
          : null);

  return (
    <>
      <main>
        <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col justify-center gap-9 px-4 py-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-petal">A voice for every Albertan</p>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Help build Alberta&apos;s Voice, one neighbour at a time.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-ink/75">
              We are recruiting a grassroots community of Albertans who want this province to stay in Canada, stand up
              for constitutional democracy, and welcome the people who help Alberta grow.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-ink/75">
              Captains are local connectors. They reach out to people they know, invite them into the campaign, and help
              turn private concern into public momentum.
            </p>
          </div>

          {statusMessage ? (
            <p className="mx-auto w-full max-w-3xl rounded-md border border-line bg-white p-3 text-center text-sm text-ink/80 shadow-sm">
              {statusMessage}
            </p>
          ) : null}

          <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-7">
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
              <Link
                href="/signup"
                className="focus-ring mt-6 block rounded-md bg-spruce px-5 py-3 text-center font-semibold text-white"
              >
                Join as a captain
              </Link>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-field text-sm font-bold uppercase tracking-wide text-spruce shadow-sm md:h-16 md:w-16">
                OR
              </div>
            </div>

            <form action={signupForUpdates} className="rounded-lg border border-line bg-white p-5 shadow-sm shadow-sky/10">
              <div className="border-b border-line pb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Keep me in the loop</p>
                <h2 className="mt-1 text-xl font-semibold">Sign up for updates</h2>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  Get campaign updates, event invitations, referendum explainers, and useful ways to help.
                </p>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium">First name</span>
                  <input
                    name="first_name"
                    autoComplete="given-name"
                    maxLength={60}
                    required
                    className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Last name</span>
                  <input
                    name="last_name"
                    autoComplete="family-name"
                    maxLength={60}
                    required
                    className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={200}
                    required
                    className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
                  />
                </label>
                <label className="flex gap-3 text-sm leading-6 text-ink/75">
                  <input name="consent" type="checkbox" value="yes" required className="mt-1 h-4 w-4 shrink-0" />
                  <span>
                    I agree to receive periodic Alberta&apos;s Voice email updates. See our{" "}
                    <a
                      href="https://albertasvoice.ca/privacy.html"
                      className="font-semibold text-spruce underline decoration-spruce/40 underline-offset-4 hover:decoration-spruce"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                <Turnstile siteKey={turnstileSiteKey} />
                <button className="focus-ring rounded-md bg-spruce px-5 py-3 text-center font-semibold text-white">
                  Sign up for updates
                </button>
                <p className="text-sm leading-6 text-ink/70">
                  Together, we can say clearly: <strong>No to the Nine. Stay in Canada.</strong>
                </p>
              </div>
            </form>
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
