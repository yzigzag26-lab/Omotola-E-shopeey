"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Thumbnail variant improves grid performance; same 4:5 container either way. */
  thumbSrc?: string | null;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Optional label shown inside the fallback, e.g. product initials. */
  fallbackLabel?: string;
};

/**
 * The single image container used by every product surface (cards, galleries,
 * cart lines, admin previews).
 *
 * - Fixed 4:5 aspect ratio, identical across all categories and breakpoints.
 * - `object-contain` so products are never cropped or stretched, whatever the
 *   source aspect ratio the seller uploads.
 * - Branded fallback when an image is missing or fails to load.
 */
export function ProductImage({
  src,
  alt,
  thumbSrc,
  priority = false,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
  className = "",
  fallbackLabel,
}: Props) {
  const [failed, setFailed] = useState(false);
  const usableSrc = !failed && src ? src : null;
  const usableThumb = !failed && thumbSrc ? thumbSrc : usableSrc;

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden bg-ivory-deep ${className}`}
    >
      {usableSrc ? (
        <Image
          src={usableThumb ?? usableSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setFailed(true)}
          className="object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-gold/60" />
          <span className="font-display text-lg text-muted">
            {fallbackLabel ?? alt}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/80">
            Image coming soon
          </span>
        </div>
      )}
    </div>
  );
}
