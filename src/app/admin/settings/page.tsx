import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireAdminPage();
  const { data: settings } = await session.supabase.from("store_settings").select("*").eq("id", true).maybeSingle();

  return (
    <AdminShell email={session.email} active="/admin/settings">
      <p className="eyebrow">Configuration</p>
      <h1 className="mt-2 font-display text-3xl">Store settings</h1>
      <p className="mt-1 text-sm text-muted">Non-secret storefront details. Currency is fixed to Nigerian naira.</p>

      <div className="mt-6 max-w-3xl">
        {settings ? (
          <SettingsForm settings={settings} />
        ) : (
          <p className="card p-5 text-sm text-muted">Settings row is missing. Run the database migration.</p>
        )}
      </div>
    </AdminShell>
  );
}
