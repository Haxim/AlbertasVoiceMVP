import Link from "next/link";

export default function HelpMessagesPage() {
  const keyMessages = [
    {
      title: "This Is a Separation Agenda. Full Stop.",
      body: [
        "These questions may be dressed up as immigration policy or constitutional reform, but they all point in one direction: pulling Alberta away from Canada.",
        "They create conflict with the federal government. They weaken national institutions. They set the stage for separation, whether they say it outright or not."
      ],
      bottomLine: "This referendum isn't about fixing problems. It's about dividing the country."
    },
    {
      title: "This Referendum Puts Alberta's Economy at Risk",
      body: [
        "Alberta grows when people come here to work, invest, and build a future. These proposals send the opposite message:"
      ],
      bullets: ["You may not be welcome", "You may pay more for basic services", "Your rights may not be secure"],
      bottomLine: "If people stop choosing Alberta, our economy shrinks. It's that simple."
    },
    {
      title: "We Were All Newcomers Once",
      body: [
        "Alberta didn't start with us. It was built by people who came from somewhere else. And not always welcomed.",
        "Chinese, Jewish, Ukrainians, Irish, and on and on. We know what that looks like. We've seen it before. Are we really going to become that place again?"
      ],
      bottomLine: "Alberta is stronger when we open doors, not when we close them."
    }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="border-b border-line pb-8">
        <Link href="/help" className="text-sm font-bold uppercase tracking-wide text-petal hover:text-petal/80">
          Back to Captain help
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Key messages</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Use these messages as a shared foundation for conversations, emails, event remarks, and local organizing.
        </p>
      </section>

      <section className="mt-8 grid gap-5">
        {keyMessages.map((message, index) => (
          <article key={message.title} className="rounded-lg border border-line bg-white p-6 shadow-sm shadow-sky/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-spruce text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-ink">{message.title}</h2>
                <div className="mt-4 space-y-3 text-base leading-7 text-ink/75">
                  {message.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {message.bullets ? (
                    <ul className="space-y-2 pl-5">
                      {message.bullets.map((bullet) => (
                        <li key={bullet} className="list-disc">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <p className="mt-5 rounded-md border-l-4 border-gold bg-field px-4 py-3 font-semibold leading-7 text-ink">
                  Bottom line: {message.bottomLine}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
