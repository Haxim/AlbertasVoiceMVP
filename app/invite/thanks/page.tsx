import Link from "next/link";

export default async function InviteThanksPage({ searchParams }: { searchParams?: Promise<{ declined?: string }> }) {
  const params = await searchParams;
  const declined = params?.declined === "1";
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-lg border border-line bg-white p-6 text-center">
        <h1 className="text-3xl font-bold">{declined ? "You are not subscribed" : "Thanks for opting in"}</h1>
        <p className="mt-3 leading-7 text-ink/70">
          {declined
            ? "We recorded your choice and will not send campaign updates from this invite."
            : "Your preference has been saved. You can unsubscribe from SMS by replying STOP."}
        </p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-spruce px-4 py-2 font-semibold text-white">
          Back home
        </Link>
      </div>
    </main>
  );
}
