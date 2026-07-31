import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ThankEmailComposer } from "@/components/thank-email-composer";
import { sendThankYouEmail } from "@/lib/actions/thank";
import { getCurrentProfile, requireThankAccess } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtime-env";
import { getThankYouEmailLog, type ThankYouEmailLogRow } from "@/lib/server/thank";

export default async function ThankPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireThankAccess(profile);
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const sort = parseSort(params?.sort);
  const direction = parseDirection(params?.dir);
  const sentEmails = sortThankYouEmailRows(await getThankYouEmailLog(200), sort, direction);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Thank-you emails</h1>
        <p className="mt-1 text-ink/70">Signed in as {profile.name || profile.email}</p>
      </div>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      {params?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}
      <ThankEmailComposer action={sendThankYouEmail} turnstileSiteKey={turnstileSiteKey} />
      <ThankYouEmailLogTable rows={sentEmails} sort={sort} direction={direction} />
    </main>
  );
}

type ThankYouEmailSort = "recipient_email" | "sent_at" | "sender";
type SortDirection = "asc" | "desc";

function ThankYouEmailLogTable({
  rows,
  sort,
  direction
}: {
  rows: ThankYouEmailLogRow[];
  sort: ThankYouEmailSort;
  direction: SortDirection;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line p-5">
        <h2 className="text-xl font-semibold">Sent thank-you emails</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-field text-xs uppercase text-ink/60">
            <tr>
              <SortableHeader label="Destination email" field="recipient_email" activeSort={sort} direction={direction} />
              <SortableHeader label="Time sent" field="sent_at" activeSort={sort} direction={direction} />
              <SortableHeader label="Sent by" field="sender" activeSort={sort} direction={direction} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{row.recipient_email}</td>
                <td className="px-4 py-3 text-ink/70">{formatSentAt(row.sent_at)}</td>
                <td className="px-4 py-3 text-ink/70">{senderLabel(row)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-ink/60">
                  No thank-you emails sent yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableHeader({
  label,
  field,
  activeSort,
  direction
}: {
  label: string;
  field: ThankYouEmailSort;
  activeSort: ThankYouEmailSort;
  direction: SortDirection;
}) {
  const isActive = activeSort === field;
  const nextDirection: SortDirection = isActive && direction === "asc" ? "desc" : "asc";
  const indicator = isActive ? (direction === "asc" ? " ↑" : " ↓") : "";
  return (
    <th className="px-4 py-3">
      <Link
        href={`/thank?sort=${field}&dir=${nextDirection}` as Route}
        className="focus-ring inline-flex rounded-sm font-semibold hover:text-spruce"
      >
        {label}
        <span aria-hidden="true">{indicator}</span>
      </Link>
    </th>
  );
}

function formatSentAt(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Edmonton"
  }).format(new Date(value));
}

function senderLabel(row: ThankYouEmailLogRow) {
  const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
  return sender?.name || sender?.email || "Alberta's Voice";
}

function parseSort(value?: string): ThankYouEmailSort {
  if (value === "recipient_email" || value === "sent_at" || value === "sender") return value;
  return "sent_at";
}

function parseDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function sortThankYouEmailRows(rows: ThankYouEmailLogRow[], sort: ThankYouEmailSort, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort === "sent_at") {
      return multiplier * (new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    }
    const aValue = sort === "sender" ? senderLabel(a) : a.recipient_email;
    const bValue = sort === "sender" ? senderLabel(b) : b.recipient_email;
    return multiplier * aValue.localeCompare(bValue, "en-CA", { sensitivity: "base" });
  });
}
