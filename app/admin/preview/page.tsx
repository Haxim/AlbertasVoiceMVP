import { redirect } from "next/navigation";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";

export default async function AdminPreviewPage({
  searchParams
}: {
  searchParams?: Promise<{ selection?: string; audience?: string; count?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireAdmin(profile);
  const audienceLabel = params?.audience === "CAPTAINS" ? "captains" : "contacts";
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-6">
        <h1 className="text-2xl font-bold">Audience preview</h1>
        <p className="mt-4 text-lg">
          {selectionLabel(params?.selection)}: <strong>{params?.count || 0}</strong> {audienceLabel}
        </p>
      </div>
    </main>
  );
}

function selectionLabel(selection?: string) {
  switch (selection) {
    case "ALL_UPDATES":
      return "All updates";
    case "WEEKLY_DIGEST":
      return "Weekly digest only";
    case "VOTE_REMINDER_ONLY":
      return "Vote reminder only";
    case "CAPTAINS":
      return "Captains only";
    case "ALL":
      return "All Contacts (Emergency Broadcast)";
    default:
      return "All updates";
  }
}
