export default function Loading() {
  return (
    <div className="shell flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
      <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border border-line border-t-burgundy" />
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted">Loading</span>
    </div>
  );
}
