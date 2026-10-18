import { formatMoney } from "@/lib/format/money";

export function Price({
  kobo,
  className = "",
  compareAtKobo,
}: {
  kobo: number;
  className?: string;
  compareAtKobo?: number | null;
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="tabular-nums">{formatMoney(kobo)}</span>
      {compareAtKobo && compareAtKobo > kobo ? (
        <span className="text-xs text-muted line-through tabular-nums">{formatMoney(compareAtKobo)}</span>
      ) : null}
    </span>
  );
}
