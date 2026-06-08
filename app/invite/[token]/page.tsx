import { notFound } from "next/navigation";
import { acceptInvite, declineInvite } from "@/lib/actions/invites";
import { getInviteByToken } from "@/lib/queries";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite) notFound();
  const captainName = invite.profiles?.name || "a local captain";
  const isClosed = invite.status !== "PENDING";
  const inviteeEmail = invite.invitee_email?.trim();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-line bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Invitation</p>
        <h1 className="mt-2 text-3xl font-bold">{captainName} invited you to hear from Alberta&apos;s Voice.</h1>
        <p className="mt-4 leading-7 text-ink/75">
          {inviteeEmail
            ? `These settings apply to updates sent to ${inviteeEmail}.`
            : "These settings apply to your Alberta's Voice updates."}
        </p>
        <p className="mt-3 leading-7 text-ink/75">
          You are not subscribed yet. Choose what you want to receive, or decline this invitation.
        </p>
        {isClosed ? (
          <p className="mt-6 rounded-md bg-field p-4 font-medium">This invite is currently marked {invite.status.toLowerCase()}.</p>
        ) : (
          <form action={acceptInvite} className="mt-6 space-y-5">
            <input type="hidden" name="token" value={token} />
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
                I agree to receive the selected Alberta&apos;s Voice emails at the address used for this invitation. I can
                unsubscribe at any time.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-line p-3">
              <input name="captainEmailConsent" type="checkbox" value="yes" defaultChecked className="mt-1 h-4 w-4" />
              <span className="font-medium">I wish to receive direct emails from {captainName}</span>
            </label>
            <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">
              Save preference
            </button>
          </form>
        )}
        {!isClosed ? (
          <form action={declineInvite} className="mt-3">
            <input type="hidden" name="token" value={token} />
            <button className="focus-ring w-full rounded-md border border-line px-4 py-3 font-semibold">
              Decline this invitation
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
