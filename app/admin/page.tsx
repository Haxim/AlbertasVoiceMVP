import { redirect } from "next/navigation";
import { adminExportSubscribers, previewBroadcastAudience, sendEmailBroadcast } from "@/lib/actions/admin";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { getAdminCounts } from "@/lib/queries";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireAdmin(profile);
  const counts = await getAdminCounts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Minimal admin</h1>
      <p className="mt-2 text-ink/70">Consent-aware admin tools for a lean MVP.</p>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      {params?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Metric label="Captains" value={counts.captains} />
        <Metric label="Invites" value={counts.invites} />
        <Metric label="Subscribers" value={counts.subscribers} />
        <Metric label="Suppressed" value={counts.suppressed} />
      </section>
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <form action={previewBroadcastAudience} className="space-y-4 rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold">Preview audience</h2>
          <PreferenceSelect />
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Preview count</button>
        </form>
        <form action={adminExportSubscribers} className="space-y-4 rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-semibold">Export subscribers CSV</h2>
          <PreferenceSelect />
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Download CSV</button>
        </form>
      </section>
      <section className="mt-8 rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-semibold">Send email broadcast</h2>
        <form action={sendEmailBroadcast} className="mt-4 space-y-4">
          <PreferenceSelect />
          <label className="block">
            <span className="text-sm font-medium">Subject</span>
            <input name="subject" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Message</span>
            <textarea name="body" rows={8} required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="flex items-start gap-3 rounded-md bg-field p-4 text-sm leading-6">
            <input name="confirmConsent" type="checkbox" value="yes" required className="mt-1 h-4 w-4" />
            <span>
              Send only to opted-in, non-unsubscribed subscribers matching this preference. I have reviewed the message.
            </span>
          </label>
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Send email</button>
        </form>
      </section>
      <p className="mt-6 text-sm leading-6 text-ink/65">
        SMS broadcast remains intentionally disabled until final message templates and opt-out language are approved.
      </p>
    </main>
  );
}

function PreferenceSelect() {
  return (
    <label className="block">
      <span className="text-sm font-medium">Preference</span>
      <select name="preference" className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2">
        <option value="ALL">All opted-in subscribers</option>
        <option value="ALL_UPDATES">All updates</option>
        <option value="WEEKLY_DIGEST">Weekly digest only</option>
        <option value="VOTE_REMINDER_ONLY">Vote reminder only</option>
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-ink/65">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
