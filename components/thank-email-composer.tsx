"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { Turnstile } from "@/components/turnstile";
import type { StripeDonorRow } from "@/lib/server/thank";

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
  turnstileSiteKey,
  donors
}: {
  action: (formData: FormData) => void | Promise<void>;
  turnstileSiteKey?: string | null;
  donors: StripeDonorRow[];
}) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [amount, setAmount] = useState("");
  const [donorId, setDonorId] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(() => thankYouTemplate("", ""));
  const previewBlocks = useMemo(() => markdownToPreviewBlocks(body), [body]);

  function generateEmail() {
    setBody(thankYouTemplate(firstName, amount));
  }

  function generateForDonor(donor: StripeDonorRow) {
    const donorFirstName = firstNameFromDonor(donor);
    const donorAmount = amountFromDonor(donor);
    setRecipientEmail(donor.email);
    setFirstName(donorFirstName);
    setAmount(donorAmount);
    setDonorId(donor.id);
    setSubject(DEFAULT_SUBJECT);
    setBody(thankYouTemplate(donorFirstName, donorAmount));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-6 space-y-5">
      <form action={action} className="space-y-5">
        <section className="rounded-lg border border-line bg-white p-4">
          <input name="donorId" type="hidden" value={donorId} />
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-sm font-medium">Recipient email</span>
              <input
                name="to"
                type="email"
                required
                value={recipientEmail}
                onChange={(event) => {
                  setRecipientEmail(event.target.value);
                  setDonorId("");
                }}
                className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">First name</span>
              <input
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setDonorId("");
                }}
                className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Amount</span>
              <input
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setDonorId("");
                }}
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
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
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
      <DonorTable donors={donors} onGenerate={generateForDonor} />
    </div>
  );
}

type DonorSort = "name" | "amount" | "email" | "sent";
type SortDirection = "asc" | "desc";

function DonorTable({ donors, onGenerate }: { donors: StripeDonorRow[]; onGenerate: (donor: StripeDonorRow) => void }) {
  const [sort, setSort] = useState<DonorSort>("sent");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const sortedDonors = useMemo(() => sortDonors(donors, sort, direction), [donors, sort, direction]);

  function toggleSort(field: DonorSort) {
    if (sort === field) {
      setDirection(direction === "asc" ? "desc" : "asc");
      return;
    }
    setSort(field);
    setDirection(field === "amount" ? "desc" : "asc");
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line p-5">
        <h2 className="text-xl font-semibold">Stripe donors over $250 lifetime</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-field text-xs uppercase text-ink/60">
            <tr>
              <DonorHeader label="Name" field="name" sort={sort} direction={direction} onSort={toggleSort} />
              <DonorHeader label="Amount" field="amount" sort={sort} direction={direction} onSort={toggleSort} />
              <DonorHeader label="Email" field="email" sort={sort} direction={direction} onSort={toggleSort} />
              <DonorHeader label="Sent date" field="sent" sort={sort} direction={direction} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedDonors.map((donor) => (
              <tr key={donor.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{donor.name || "Donor"}</td>
                <td className="px-4 py-3 text-ink/70">{formatMoney(donor.amount_cents, donor.currency)}</td>
                <td className="px-4 py-3 text-ink/70">{donor.email}</td>
                <td className="px-4 py-3 text-ink/70">
                  {donor.thank_you_sent_at ? (
                    formatSentAt(donor.thank_you_sent_at)
                  ) : (
                    <button
                      type="button"
                      onClick={() => onGenerate(donor)}
                      className="focus-ring rounded-md bg-spruce px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Generate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sortedDonors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink/60">
                  No synced Stripe donors over $250 yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DonorHeader({
  label,
  field,
  sort,
  direction,
  onSort
}: {
  label: string;
  field: DonorSort;
  sort: DonorSort;
  direction: SortDirection;
  onSort: (field: DonorSort) => void;
}) {
  const indicator = sort === field ? (direction === "asc" ? " ^" : " v") : "";
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={() => onSort(field)} className="focus-ring rounded-sm font-semibold hover:text-spruce">
        {label}
        <span aria-hidden="true">{indicator}</span>
      </button>
    </th>
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
  const donation = parseDonationAmount(amount) || 500;

  return {
    roadwaySigns: roundedAtLeastOne(donation / 100),
    mediumSigns: mroundAtLeastOne(donation / 30, 5),
    tShirts: mroundAtLeastOne(donation / 15, 5),
    tents: formatTentQuantity(donation / 1500),
    tentCountForPlural: Math.ceil(donation / 1500),
    buttons: mroundAtLeastOne(donation / 0.43, 100),
    lawnSigns: mroundAtLeastOne(donation / 6, 5)
  };
}

function roundedAtLeastOne(value: number) {
  return Math.max(1, Math.round(value));
}

function mroundAtLeastOne(value: number, multiple: number) {
  return Math.max(1, Math.round(value / multiple) * multiple);
}

function formatTentQuantity(tents: number) {
  if (tents < 1) return formatFraction(tents);
  const rounded = Math.round(tents * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

function formatFraction(value: number) {
  const denominator = 10;
  const numerator = Math.max(1, Math.round(value * denominator));
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function pluralize(count: number, singular: string) {
  if (count === 1) return singular;
  return `${singular}s`;
}

function parseDonationAmount(amount: string) {
  const parsed = Number(amount.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function firstNameFromDonor(donor: StripeDonorRow) {
  const name = donor.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return donor.email.split("@")[0];
}

function amountFromDonor(donor: StripeDonorRow) {
  return (donor.amount_cents / 100).toFixed(donor.amount_cents % 100 === 0 ? 0 : 2);
}

function formatMoney(amountCents: number, currency: string) {
  return (amountCents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2
  });
}

function formatSentAt(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Edmonton"
  }).format(new Date(value));
}

function sortDonors(donors: StripeDonorRow[], sort: DonorSort, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...donors].sort((a, b) => {
    if (sort === "amount") return multiplier * (a.amount_cents - b.amount_cents);
    if (sort === "sent") {
      const aTime = a.thank_you_sent_at ? new Date(a.thank_you_sent_at).getTime() : 0;
      const bTime = b.thank_you_sent_at ? new Date(b.thank_you_sent_at).getTime() : 0;
      return multiplier * (aTime - bTime);
    }
    const aValue = sort === "name" ? a.name || "" : a.email;
    const bValue = sort === "name" ? b.name || "" : b.email;
    return multiplier * aValue.localeCompare(bValue, "en-CA", { sensitivity: "base" });
  });
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
