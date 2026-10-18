export default function CartLoading() {
  return (
    <div className="shell py-12 md:py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading your bag</span>
      <div aria-hidden="true" className="animate-pulse">
        <div className="h-3 w-20 bg-line/70" />
        <div className="mt-5 h-10 w-56 bg-line/60" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="h-28 w-full bg-line/50" />
            <div className="h-28 w-full bg-line/40" />
          </div>
          <div className="h-64 w-full bg-line/40" />
        </div>
      </div>
    </div>
  );
}
