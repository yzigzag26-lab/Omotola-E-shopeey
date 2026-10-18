import type { AvailabilityStatus } from "@/lib/supabase/database.types";

const LABELS: Record<AvailabilityStatus, string> = {
  available: "Available — confirmed on order",
  made_to_order: "Made to order",
  temporarily_unavailable: "Temporarily unavailable",
};

const STYLES: Record<AvailabilityStatus, string> = {
  available: "border-success/30 text-success",
  made_to_order: "border-gold/50 text-[#7a6136]",
  temporarily_unavailable: "border-line text-muted",
};

export function AvailabilityBadge({ status, short = false }: { status: AvailabilityStatus; short?: boolean }) {
  const label = short
    ? status === "available"
      ? "Available"
      : status === "made_to_order"
        ? "Made to order"
        : "Unavailable"
    : LABELS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${STYLES[status]}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          status === "available" ? "bg-success" : status === "made_to_order" ? "bg-gold" : "bg-muted"
        }`}
      />
      {label}
    </span>
  );
}
