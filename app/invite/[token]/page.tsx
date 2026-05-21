import { notFound } from "next/navigation";
import { acceptInvite, declineInvite } from "@/lib/actions/invites";
import { getInviteByToken } from "@/lib/queries";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await getInviteByToken(params.token);
  if (!invite) notFound();
  const captainName = invite.profiles?.name || "a local captain";
  const isClosed = invite.status !== "PENDING";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-line bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Invitation</p>
        <h1 className="mt-2 text-3xl font-bold">{captainName} invited you to hear from Alberta&apos;s Voice.</h1>
        <p className="mt-4 leading-7 text-ink/75">
          You are not subscribed yet. Choose what you want to receive, then confirm your consent. No choice is okay.
        </p>
        {isClosed ? (
          <p className="mt-6 rounded-md bg-field p-4 font-medium">This invite is currently marked {invite.status.toLowerCase()}.</p>
        ) : (
          <form action={acceptInvite} className="mt-6 space-y-5">
            <input type="hidden" name="token" value={params.token} />
            <div className="space-y-3">
              {[
                ["ALL_UPDATES", "All updates"],
                ["WEEKLY_DIGEST", "Weekly digest only"],
                ["VOTE_REMINDER_ONLY", "Vote reminder only"]
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 rounded-md border border-line p-3">
                  <input name="preference" type="radio" value={value} required className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </label>
              ))}
            </div>
            <label className="flex items-start gap-3 rounded-md bg-field p-4 text-sm leading-6">
              <input name="consent" type="checkbox" value="yes" required className="mt-1 h-4 w-4" />
              <span>
                I agree to receive the selected Alberta&apos;s Voice messages at the phone and/or email used for this
                invitation. Message frequency varies. SMS replies with STOP unsubscribe.
              </span>
            </label>
            <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">Opt in</button>
          </form>
        )}
        {!isClosed ? (
          <form action={declineInvite} className="mt-3">
            <input type="hidden" name="token" value={params.token} />
            <button className="focus-ring w-full rounded-md border border-line px-4 py-3 font-semibold">No thanks</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
