import { redirect } from "next/navigation";
import { createInvite } from "@/lib/actions/invites";
import { sendCaptainEmailMessage } from "@/lib/actions/captain-messages";
import { logout } from "@/lib/actions/auth";
import { getCaptainDashboard } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { Turnstile } from "@/components/turnstile";
import { runtimeEnv } from "@/lib/runtime-env";
import { replyToAddressForCaptain } from "@/lib/server/captain-messages";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const dashboard = await getCaptainDashboard(profile.id);
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const captainReplyAddress = await replyToAddressForCaptain(profile);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Captain dashboard</h1>
          <p className="mt-1 text-ink/70">Signed in as {profile.name || profile.email}</p>
        </div>
        <form action={logout}>
          <button className="rounded-md border border-line bg-white px-4 py-2 font-medium">Log out</button>
        </form>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Accepted referrals" value={dashboard.referralCount} />
        <Metric label="Pending invites" value={dashboard.pendingCount} />
        <Metric label="Total invites" value={dashboard.invites.length} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form action={createInvite} className="space-y-4 rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold">Invite a friend</h2>
          {params?.message ? <p className="rounded-md bg-field p-3 text-sm">{params.message}</p> : null}
          {params?.error ? <p className="rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}
          <label className="block">
            <span className="text-sm font-medium">Invitee name</span>
            <input name="inviteeName" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="flex gap-3 rounded-md border border-line bg-field/40 p-3 text-sm leading-6">
            <input name="nameUseConsent" type="checkbox" value="yes" required className="mt-1 h-4 w-4 rounded border-line" />
            <span>I allow Alberta&apos;s Voice to use my name on communications with this recipient</span>
          </label>
          <p className="text-sm leading-6 text-ink/70">
            This sends only an invitation. The recipient is not subscribed until they choose an option and check the
            consent box.
          </p>
          <Turnstile siteKey={turnstileSiteKey} />
          <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">Send invite</button>
        </form>

        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line p-5">
            <h2 className="text-xl font-semibold">My invite statuses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-field text-xs uppercase text-ink/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.invites.map((invite) => (
                  <tr key={invite.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{invite.invitee_name}</td>
                    <td className="px-4 py-3 text-ink/70">{invite.invitee_phone || invite.invitee_email}</td>
                    <td className="px-4 py-3"><StatusBadge status={invite.status} /></td>
                    <td className="px-4 py-3 text-ink/60">{new Date(invite.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {dashboard.invites.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-ink/60">No invites yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-semibold">Message invitees</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Invitees can reply to this message and replies will be forwarded to your email. They can also email you
          directly at <span className="font-mono text-ink">{captainReplyAddress}</span>
        </p>
        <form action={sendCaptainEmailMessage} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Subject</span>
            <input name="subject" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Message (Markdown)</span>
            <span className="mt-1 block text-xs leading-5 text-ink/60">
              Supports Markdown. Use [captain] for your name and [name] for the subscriber name.
            </span>
            <textarea name="body" rows={8} required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="flex items-start gap-3 rounded-md bg-field p-4 text-sm leading-6">
            <input name="confirmConsent" type="checkbox" value="yes" required className="mt-1 h-4 w-4" />
            <span>Send only to opted-in, non-unsubscribed subscribers who allow direct emails from me.</span>
          </label>
          <Turnstile siteKey={turnstileSiteKey} />
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Send email</button>
        </form>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <p className="text-sm font-medium text-ink/65">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
