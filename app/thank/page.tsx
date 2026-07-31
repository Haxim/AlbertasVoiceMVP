import { redirect } from "next/navigation";
import { ThankEmailComposer } from "@/components/thank-email-composer";
import { sendThankYouEmail, syncStripeDonors } from "@/lib/actions/thank";
import { getCurrentProfile, requireThankAccess } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtime-env";
import { getStripeDonorsOverThreshold } from "@/lib/server/thank";

export default async function ThankPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireThankAccess(profile);
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const donors = await getStripeDonorsOverThreshold();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Thank-you emails</h1>
        <p className="mt-1 text-ink/70">Signed in as {profile.name || profile.email}</p>
      </div>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      {params?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}
      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Stripe donor sync</h2>
            <p className="mt-1 text-sm text-ink/65">
              Pulls successful Stripe charges and groups donors by shipping name and shipping address for $250+ lifetime totals.
            </p>
          </div>
          <form action={syncStripeDonors}>
            <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">
              Sync Stripe donors
            </button>
          </form>
        </div>
      </section>
      <ThankEmailComposer action={sendThankYouEmail} turnstileSiteKey={turnstileSiteKey} donors={donors} />
    </main>
  );
}
