export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-burgundy"
      />
      {label}
    </span>
  );
}
