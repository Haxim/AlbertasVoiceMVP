import { notFound } from "next/navigation";
import { updateSubscription, unsubscribeSubscription } from "@/lib/actions/subscriptions";
import { getSubscriptionByToken } from "@/lib/server/subscriptions";

export default async function SubscriptionPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ message?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const subscription = await getSubscriptionByToken(token);
  if (!subscription) notFound();

  const isUnsubscribed = Boolean(subscription.unsubscribed_at);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-line bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-spruce">Subscription</p>
        <h1 className="mt-2 text-3xl font-bold">Manage Alberta&apos;s Voice updates</h1>
        <p className="mt-4 leading-7 text-ink/75">
          {subscription.email
            ? `These settings apply to updates sent to ${subscription.email}.`
            : "These settings apply to your Alberta's Voice updates."}
        </p>
        {query?.message ? <p className="mt-4 rounded-md bg-field p-3 text-sm font-medium">{query.message}</p> : null}
        {isUnsubscribed ? (
          <p className="mt-6 rounded-md bg-rose/10 p-4 font-medium text-rose">
            You are currently unsubscribed from email updates.
          </p>
        ) : null}

        <form action={updateSubscription} className="mt-6 space-y-5">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-3">
            {[
              ["ALL_UPDATES", "All updates"],
              ["WEEKLY_DIGEST", "Weekly digest only"],
              ["VOTE_REMINDER_ONLY", "Vote reminder only"]
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 rounded-md border border-line p-3">
                <input
                  name="preference"
                  type="radio"
                  value={value}
                  required
                  defaultChecked={subscription.preference === value}
                  className="h-4 w-4"
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
          <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">
            Save preference
          </button>
        </form>

        {!isUnsubscribed ? (
          <form action={unsubscribeSubscription} className="mt-3">
            <input type="hidden" name="token" value={token} />
            <button className="focus-ring w-full rounded-md border border-line px-4 py-3 font-semibold">
              Unsubscribe from email updates
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
