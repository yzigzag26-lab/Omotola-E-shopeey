export default function ShopLoading() {
  return (
    <div className="shell py-12 md:py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading products</span>
      <div aria-hidden="true" className="animate-pulse">
        <div className="h-3 w-24 bg-line/70 rounded-full" />
        <div className="mt-5 h-10 w-64 bg-line/60 rounded-full" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="aspect-[4/5] w-full bg-line/50 rounded-card" />
              <div className="mt-4 h-3 w-2/3 bg-line/60 rounded-full" />
              <div className="mt-2 h-3 w-1/3 bg-line/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
