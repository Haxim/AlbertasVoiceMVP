import Link from "next/link";

const helpSections = [
  {
    title: "Key messages",
    href: "/help/messages",
    body: "Use these messages as a shared foundation for conversations, emails, event remarks, and local organizing."
  },
  {
    title: "Store",
    href: "https://albertasvoice.ca/store",
    external: true,
    body: "Order Alberta's Voice campaign materials."
  },
  {
    title: "Resources",
    href: "https://albertasvoice.ca/resources",
    external: true,
    body: "Images, logos, brochures, and other campaign files."
  },
  {
    title: "Captain guide",
    href: "/help/guide",
    body: "Learn how to use the captain page, send invites, understand consent, and message supporters."
  }
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="border-b border-line pb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-petal">Captain help</p>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Captain help</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Practical help for inviting people, explaining the campaign, and finding materials.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {helpSections.map((section) => (
          section.external ? (
            <a
              key={section.title}
              href={section.href}
              className="focus-ring rounded-lg border border-line bg-white p-6 shadow-sm shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
              <p className="mt-3 leading-7 text-ink/75">{section.body}</p>
            </a>
          ) : (
            <Link
              key={section.title}
              href={section.href as "/help/messages" | "/help/guide"}
              className="focus-ring rounded-lg border border-line bg-white p-6 shadow-sm shadow-sky/10 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
              <p className="mt-3 leading-7 text-ink/75">{section.body}</p>
            </Link>
          )
        ))}
      </section>
    </main>
  );
}
