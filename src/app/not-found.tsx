import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-ivory px-6 py-20">
      <div className="max-w-lg text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-display text-4xl md:text-5xl">This page has moved on.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The page you were looking for does not exist, or the piece is no longer published.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Return home</Link>
          <Link href="/shop" className="btn btn-quiet">Shop the collection</Link>
        </div>
      </div>
    </main>
  );
}
