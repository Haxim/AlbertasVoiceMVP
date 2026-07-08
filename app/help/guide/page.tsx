import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";

export default async function CaptainGuidePage() {
  const profile = await getCurrentProfile();
  const captainName = profile?.name?.trim() || "A local captain";
  const sampleInvitee = "Jordan";
  const sampleSubject = `${captainName} invited you to learn more about Alberta's Voice`;
  const sampleBody = `Hi ${sampleInvitee},

${captainName} thought you might be interested in learning more about Alberta's Voice.

Alberta's Voice is a grassroots campaign working to keep Alberta in Canada and encourage Albertans to vote No on the nine referendum questions. We share information, connect supporters, and help Albertans take action in support of Alberta's future within Canada.

You are not subscribed to Alberta's Voice updates. To learn more and choose whether you'd like to receive future emails, click here:
https://join.albertasvoice.ca/invite/example

If you'd prefer not to hear from us, you can decline the invitation from that page and you will not receive further communications.

Thank you for taking a moment to learn more about Alberta's Voice.`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="border-b border-line pb-8">
        <Link href="/help" className="text-sm font-bold uppercase tracking-wide text-petal hover:text-petal/80">
          Back to Captain help
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">Captain guide</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Learn how the captain page works, what people see when you invite them, and how consent is handled.
        </p>
      </section>

      <section className="mt-8 grid gap-5">
        <GuideSection title="What happens when I send an invite?">
          <p>
            The dashboard sends a one-time invitation to the person you enter. The invite explains Alberta&apos;s Voice and
            gives them a link where they can choose whether to receive future updates.
          </p>
          <p>
            Sending an invite does not subscribe them. They become subscribed only if they open the invitation, choose an
            email preference, and check the consent box.
          </p>
        </GuideSection>

        <GuideSection title="What does the invitee see?">
          <p>
            They see an invitation page that says who invited them, explains that they are not subscribed yet, and asks
            them to choose one of three preferences: all updates, weekly digest only, or vote reminder only.
          </p>
          <p>
            They can also decline the invitation. If they decline, they are not subscribed to future campaign updates
            from that invite.
          </p>
        </GuideSection>

        <GuideSection title="Sample invite email">
          <div className="grid gap-3 rounded-md border border-line bg-field p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Subject</p>
              <p className="mt-1 font-medium">{sampleSubject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">Body</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-6 text-ink/75">{sampleBody}</pre>
            </div>
          </div>
        </GuideSection>

        <GuideSection id="use-my-name" title="What does 'use my name' mean?">
          <p>
            The checkbox lets Alberta&apos;s Voice include your name in the invitation, for example: “{captainName} thought
            you might be interested in learning more about Alberta&apos;s Voice.”
          </p>
          <p>
            Your name helps the recipient recognize that the invitation came through someone they know. Alberta&apos;s
            Voice still sends the email, and the recipient still chooses whether to opt in.
          </p>
        </GuideSection>

        <GuideSection title="Are people subscribed automatically?">
          <p>
            No. Invitees are not subscribed automatically. They must open the invite page, choose a preference, and give
            explicit consent before they receive Alberta&apos;s Voice updates.
          </p>
        </GuideSection>

        <GuideSection title="What do the statuses mean?">
          <p>
            Pending means the invite has been sent but not accepted or declined. Accepted means the person opted in.
            Declined means they chose not to subscribe. Unsubscribed means they later opted out.
          </p>
        </GuideSection>

        <GuideSection title="What does 'direct emails from me' mean?">
          <p>
            On the invite page, people can choose whether to receive direct emails from you as their captain. If they
            leave that option on, they can receive captain messages you send from the dashboard.
          </p>
          <p>
            If they turn it off, they can still receive campaign updates from Alberta&apos;s Voice if they opted into
            those updates, but they will not receive direct captain messages from you.
          </p>
        </GuideSection>

        <GuideSection title="When can I message invitees?">
          <p>
            The message tool sends only to people who opted in, have not unsubscribed, and allow direct emails from you.
            It does not send to pending invites or people who declined.
          </p>
        </GuideSection>

        <GuideSection title="What should I say in a first message?">
          <p>
            Keep it personal, local, and brief. Remind people why staying in Canada matters to you, point them to one
            useful resource, and invite them to reply with questions or ideas.
          </p>
          <p>
            In captain messages, you can use <span className="font-mono">[captain]</span> for your name and{" "}
            <span className="font-mono">[name]</span> for the subscriber&apos;s name.
          </p>
        </GuideSection>

        <GuideSection title="How do unsubscribes work?">
          <p>
            Every update email includes a link where people can manage their preferences or unsubscribe. If someone
            unsubscribes, the dashboard message tool will skip them.
          </p>
        </GuideSection>
      </section>
    </main>
  );
}

function GuideSection({
  id,
  title,
  children
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-line bg-white p-6 shadow-sm shadow-sky/10">
      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-4 space-y-3 leading-7 text-ink/75">{children}</div>
    </section>
  );
}
