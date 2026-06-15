import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { getCaptainSignupReport } from "@/lib/server/admin";
import { captainSignupReportSchema } from "@/lib/validation";

export default async function CaptainSignupReportPage({
  searchParams
}: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; minSignups?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireAdmin(profile);

  const filters = captainSignupReportSchema.parse({
    startDate: params?.startDate || "",
    endDate: params?.endDate || "",
    minSignups: params?.minSignups || 20
  });
  const rows = await getCaptainSignupReport({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    minSignups: filters.minSignups
  });
  const query = reportQuery(filters);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Captain signup report</h1>
          <p className="mt-2 text-ink/70">{reportSummary(filters, rows.length)}</p>
        </div>
        <Link href="/admin" className="focus-ring rounded-md border border-line px-4 py-2 font-semibold text-spruce">
          Back to admin
        </Link>
      </div>

      <form action="/admin/captain-signups" className="mt-6 grid gap-4 rounded-lg border border-line bg-white p-5 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium">Start date</span>
          <input
            name="startDate"
            type="date"
            defaultValue={filters.startDate || ""}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">End date</span>
          <input
            name="endDate"
            type="date"
            defaultValue={filters.endDate || ""}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Minimum signups</span>
          <input
            name="minSignups"
            type="number"
            min="0"
            defaultValue={filters.minSignups}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-3">
          <button className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white">Run report</button>
          <a
            href={`/api/admin/captain-signups/export?${query}`}
            className="focus-ring rounded-md border border-spruce px-4 py-2 font-semibold text-spruce"
          >
            Download CSV
          </a>
        </div>
      </form>

      <section className="mt-6 overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-field">
            <tr>
              <th className="px-4 py-3 font-semibold">Captain</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Verified signups</th>
              <th className="px-4 py-3 font-semibold">Active contacts</th>
              <th className="px-4 py-3 font-semibold">First signup</th>
              <th className="px-4 py-3 font-semibold">Last signup</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.captainId} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-medium">{row.captainName}</td>
                  <td className="px-4 py-3">{row.captainEmail || "-"}</td>
                  <td className="px-4 py-3">{row.verifiedSignups}</td>
                  <td className="px-4 py-3">{row.activeContacts}</td>
                  <td className="px-4 py-3">{formatDate(row.firstSignupAt)}</td>
                  <td className="px-4 py-3">{formatDate(row.lastSignupAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-ink/70" colSpan={6}>
                  No captains match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function reportQuery(filters: { startDate?: string; endDate?: string; minSignups: number }) {
  const query = new URLSearchParams();
  if (filters.startDate) query.set("startDate", filters.startDate);
  if (filters.endDate) query.set("endDate", filters.endDate);
  query.set("minSignups", String(filters.minSignups));
  return query.toString();
}

function reportSummary(filters: { startDate?: string; endDate?: string; minSignups: number }, count: number) {
  const range = filters.startDate || filters.endDate ? `${filters.startDate || "beginning"} to ${filters.endDate || "today"}` : "all time";
  return `${count} captains with at least ${filters.minSignups} verified signups, ${range}.`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value));
}
