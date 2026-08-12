import { notFound } from "next/navigation";
import { createSelfReferral } from "@/lib/actions/invites";
import { Turnstile } from "@/components/turnstile";
import { runtimeEnv } from "@/lib/runtime-env";
import { getCaptainForSelfReferral } from "@/lib/server/invites";

export default async function CaptainReferralUrlPage({
  searchParams
}: {
  searchParams?: Promise<{ captainid?: string; captainId?: string; message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const captainCode = params?.captainid || params?.captainId || "";
  if (!captainCode) notFound();

  const captain = await getCaptainForSelfReferral(captainCode);
  if (!captain) notFound();

  const captainName = captain.name || "A local captain";
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm shadow-sky/10">
        <h1 className="text-3xl font-bold">{captainName} invited you to get updates from Alberta&apos;s Voice.</h1>
        <p className="mt-4 leading-7 text-ink/75">
          Alberta&apos;s Voice is a grassroots campaign working to keep Alberta in Canada and encourage Albertans to vote
          No on the nine referendum questions.
        </p>
        <p className="mt-3 leading-7 text-ink/75">
          Enter your email and we&apos;ll send you a one-time invitation where you can choose whether to receive future updates.
          You are not subscribed unless you opt in from that email.
        </p>

        {params?.message ? <p className="mt-5 rounded-md bg-field p-3 text-sm font-medium">{params.message}</p> : null}
        {params?.error ? <p className="mt-5 rounded-md bg-rose/10 p-3 text-sm font-medium text-rose">{params.error}</p> : null}

        <form action={createSelfReferral} className="mt-6 space-y-4">
          <input type="hidden" name="captainCode" value={captainCode} />
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <Turnstile siteKey={turnstileSiteKey} />
          <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">
            Send me the invitation
          </button>
        </form>
      </div>
    </main>
  );
}
