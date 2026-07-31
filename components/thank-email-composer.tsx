"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Turnstile } from "@/components/turnstile";

const DEFAULT_SUBJECT = "Thank you from Alberta's Voice";

export function thankYouTemplate(firstName: string, amount: string) {
  const name = firstName.trim() || "[First Name]";
  const giftAmount = formatGiftAmount(amount);
  const impact = donationImpact(amount);

  return `Hi ${name},

**Thank you so much.**

Your gift is already at work and we wanted you to be among the first to see what it's made possible.

Because of donations like yours, Alberta's Voice has made the pivot from a grassroots idea into a full, real campaign. We are so grateful.

To make the impact of your donation really clear, your ${giftAmount} donation is enough to add any one of the following key elements to our campaign:

${impact.roadwaySigns} - Large 4' by 8' ${pluralize(impact.roadwaySigns, "roadway sign")}

${impact.mediumSigns} - Medium 4' x 4' ${pluralize(impact.mediumSigns, "sign")} in highly visible spots across our cities

${impact.tShirts} ${pluralize(impact.tShirts, "t-shirt")}

${impact.tents} of our branded, pop up event ${pluralize(impact.tentCountForPlural, "tent")}

${impact.buttons} ${pluralize(impact.buttons, "button")}, or

${impact.lawnSigns} Lawn ${pluralize(impact.lawnSigns, "Sign")}!

None of this happens without people like you deciding this mattered enough to back it with a donation.

We know what we're up against. Ten questions designed to divide Albertans, pull us away from each other, and pull us away from Canada. But we also know that ordinary Albertans - donating, volunteering, putting up a sign, talking to a neighbour - are exactly how campaigns like this get won.

Thank you for being one of them.

If you haven't yet, we'd love for you to become a captain at join.albertasvoice.ca and help us reach even more Albertans before referendum day.

Once again, our most heartfelt thank you to you.

Keep up the great work. Stay in Canada. No to the Nine.

Stephen & Stephen  
Alberta's Voice`;
}

export function ThankEmailComposer({
  action,
  turnstileSiteKey
}: {
  action: (formData: FormData) => void | Promise<void>;
  turnstileSiteKey?: string | null;
}) {
  const [firstName, setFirstName] = useState("");
  const [amount, setAmount] = useState("");
  const [body, setBody] = useState(() => thankYouTemplate("", ""));
  const previewBlocks = useMemo(() => markdownToPreviewBlocks(body), [body]);

  function generateEmail() {
    setBody(thankYouTemplate(firstName, amount));
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      <section className="rounded-lg border border-line bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-medium">Recipient email</span>
            <input name="to" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">First name</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="500"
              className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={generateEmail}
            className="focus-ring rounded-md bg-spruce px-4 py-2 font-semibold text-white"
          >
            Generate
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Subject</span>
          <input
            name="subject"
            required
            defaultValue={DEFAULT_SUBJECT}
            className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
          />
        </label>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Preview</h2>
          </div>
          <div className="bg-[#f5f7fa] p-4">
            <div className="mx-auto max-w-[600px] overflow-hidden rounded-xl bg-white">
              <div className="bg-[#003754] px-8 py-9 text-center text-white">
                <img src="/icon.png" alt="" className="mx-auto mb-4 h-24 w-24" />
                <p className="text-3xl font-bold leading-tight">Alberta&apos;s Voice</p>
                <p className="mt-3 text-base text-blue-100">A Voice for Every Albertan</p>
              </div>
              <div className="px-6 py-8 text-base leading-7 text-[#374151] sm:px-10">
                {previewBlocks}
                <p className="mb-4 text-sm leading-6 text-[#6b7280]">
                  You are receiving this thank-you because you donated to Alberta&apos;s Voice.
                </p>
                <p className="text-sm leading-6 text-[#6b7280]">
                  Authorized by Alberta&apos;s Voice, Referendum Third Party Advertiser. Contact:{" "}
                  <span className="underline">info@albertasvoice.ca</span>.
                </p>
              </div>
              <div className="px-10 pb-10">
                <hr className="my-6 border-[#e5e7eb]" />
                <p className="text-center text-xl font-bold text-[#003754]">No to the Nine. Stay in Canada.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4">
          <label className="block">
            <span className="text-lg font-semibold">Message</span>
            <textarea
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={28}
              required
              className="focus-ring mt-3 min-h-[720px] w-full rounded-md border border-line px-3 py-2 font-mono text-sm leading-6"
            />
          </label>
          <label className="mt-4 flex items-start gap-3 rounded-md bg-field p-4 text-sm leading-6">
            <input name="confirmConsent" type="checkbox" value="yes" required className="mt-1 h-4 w-4" />
            <span>I have reviewed this thank-you email and confirmed the recipient should receive it.</span>
          </label>
          <div className="mt-4">
            <Turnstile siteKey={turnstileSiteKey} />
          </div>
          <button className="focus-ring mt-4 rounded-md bg-spruce px-4 py-2 font-semibold text-white">Send thank-you</button>
        </div>
      </section>
    </form>
  );
}

function formatGiftAmount(amount: string) {
  const trimmed = amount.trim();
  if (!trimmed) return "$[AMOUNT]";
  const parsed = parseDonationAmount(trimmed);
  if (!parsed) return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
  return parsed.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 2
  });
}

function donationImpact(amount: string) {
  const multiplier = Math.max((parseDonationAmount(amount) || 500) / 500, 0);
  const tentThirds = Math.max(1, Math.ceil(multiplier));

  return {
    roadwaySigns: scaledQuantity(5, multiplier),
    mediumSigns: scaledQuantity(15, multiplier),
    tShirts: scaledQuantity(35, multiplier),
    tents: formatTentQuantity(tentThirds),
    tentCountForPlural: Math.ceil(tentThirds / 3),
    buttons: scaledQuantity(1200, multiplier),
    lawnSigns: scaledQuantity(85, multiplier)
  };
}

function scaledQuantity(base: number, multiplier: number) {
  return Math.max(1, Math.ceil(base * multiplier));
}

function formatTentQuantity(thirds: number) {
  const whole = Math.floor(thirds / 3);
  const remainder = thirds % 3;
  if (!whole && remainder === 1) return "1/3";
  if (!whole && remainder === 2) return "2/3";
  if (whole && !remainder) return String(whole);
  return `${whole} ${remainder}/3`;
}

function pluralize(count: number, singular: string) {
  if (count === 1) return singular;
  return `${singular}s`;
}

function parseDonationAmount(amount: string) {
  const parsed = Number(amount.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function markdownToPreviewBlocks(markdown: string) {
  const blocks = markdown.trim().split(/\n{2,}/).filter(Boolean);
  if (!blocks.length) return <p className="mb-5">Start typing to preview the email.</p>;

  return blocks.map((block, index) => {
    const lines = block.split(/\n/);
    return (
      <p key={`${index}-${block.slice(0, 16)}`} className="mb-5">
        {lines.map((line, lineIndex) => (
          <span key={`${lineIndex}-${line}`}>
            {inlineMarkdown(line)}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

function inlineMarkdown(markdown: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown))) {
    if (match.index > lastIndex) nodes.push(markdown.slice(lastIndex, match.index));
    const value = match[1] || match[2] || "";
    nodes.push(
      match[1] ? (
        <strong key={`${match.index}-${value}`}>{value}</strong>
      ) : (
        <em key={`${match.index}-${value}`}>{value}</em>
      )
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) nodes.push(markdown.slice(lastIndex));
  return nodes;
}
