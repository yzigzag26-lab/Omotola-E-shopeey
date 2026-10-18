import type { Announcement } from "@/lib/types";

/**
 * Continuous right-to-left marquee. The message is read once by screen readers
 * (the duplicated track is aria-hidden), and reduced-motion users get a static,
 * horizontally-scrollable line instead of movement.
 */
export function AnnouncementMarquee({ announcement }: { announcement: Announcement | null }) {
  if (!announcement || !announcement.is_enabled || !announcement.message.trim()) return null;

  return (
    <div className="marquee-viewport overflow-hidden border-b border-ink/10 bg-ink text-ivory" role="region" aria-label="Store announcement">
      <div className="relative flex overflow-hidden py-2">
        <p className="sr-only">{announcement.message}</p>
        <div aria-hidden="true" className="marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center">
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className="flex items-center whitespace-nowrap px-6 text-[11px] uppercase tracking-[0.22em] text-ivory/90">
                  {announcement.message}
                  <span className="ml-6 h-1 w-1 rounded-full bg-gold" />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
