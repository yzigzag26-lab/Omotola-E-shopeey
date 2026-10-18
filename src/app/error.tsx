"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-ivory px-6 py-20">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">We could not load this page.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This is usually temporary. Try again, or contact us on WhatsApp if it continues.
        </p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </main>
  );
}
