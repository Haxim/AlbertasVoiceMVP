import { redirect } from "next/navigation";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";

export default async function AdminPreviewPage({ searchParams }: { searchParams?: Promise<{ preference?: string; count?: string }> }) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireAdmin(profile);
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-6">
        <h1 className="text-2xl font-bold">Audience preview</h1>
        <p className="mt-4 text-lg">
          {params?.preference || "ALL"}: <strong>{params?.count || 0}</strong> subscribers
        </p>
      </div>
    </main>
  );
}
