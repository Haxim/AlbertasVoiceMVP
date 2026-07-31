import { redirect } from "next/navigation";
import { ThankEmailComposer } from "@/components/thank-email-composer";
import { sendThankYouEmail } from "@/lib/actions/thank";
import { getCurrentProfile, requireThankAccess } from "@/lib/auth";
import { runtimeEnv } from "@/lib/runtime-env";

export default async function ThankPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  await requireThankAccess(profile);
  const turnstileSiteKey = await runtimeEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Thank-you emails</h1>
        <p className="mt-1 text-ink/70">Signed in as {profile.name || profile.email}</p>
      </div>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      {params?.error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{params.error}</p> : null}
      <ThankEmailComposer action={sendThankYouEmail} turnstileSiteKey={turnstileSiteKey} />
    </main>
  );
}
