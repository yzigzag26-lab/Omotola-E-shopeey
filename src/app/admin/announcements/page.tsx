import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const session = await requireAdminPage();
  const { data } = await session.supabase.from("announcements").select("*").eq("singleton", true).maybeSingle();

  return (
    <AdminShell email={session.email} active="/admin/announcements">
      <p className="eyebrow">Storefront</p>
      <h1 className="mt-2 font-display text-3xl">Announcement</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        One message at a time, shown as a slow right-to-left marquee. It respects reduced-motion
        preferences and disappears completely when disabled.
      </p>

      <div className="mt-6 max-w-2xl">
        <AnnouncementForm announcement={data ?? null} />
      </div>

      {data ? (
        <section className="mt-6 max-w-2xl border border-line bg-ink p-4 text-ivory">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gold">Preview</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ivory/85">
            {data.is_enabled ? data.message : "Disabled — nothing renders on the storefront."}
          </p>
        </section>
      ) : null}
    </AdminShell>
  );
}
