import { clsx } from "clsx";

const styles: Record<string, string> = {
  PENDING: "bg-gold/15 text-[#7a540c]",
  ACCEPTED: "bg-spruce/15 text-spruce",
  DECLINED: "bg-ink/10 text-ink/70",
  EXPIRED: "bg-ink/10 text-ink/70",
  UNSUBSCRIBED: "bg-rose/15 text-rose"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[status] || styles.PENDING)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
