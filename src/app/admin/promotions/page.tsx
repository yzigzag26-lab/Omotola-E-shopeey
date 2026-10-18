import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { PromotionForm } from "@/components/admin/promotion-form";
import { deletePromotionAction } from "@/app/admin/catalog-actions";
import { formatMoney } from "@/lib/format/money";
import type { Promotion } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ edit?: string }>;

export default async function AdminPromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const { edit } = await searchParams;
  const { data } = await session.supabase.from("promotions").select("*").order("created_at", { ascending: false });
  const promotions = (data ?? []) as Promotion[];
  const editing = promotions.find((promotion) => promotion.id === edit) ?? null;

  return (
    <AdminShell email={session.email} active="/admin/promotions">
      <p className="eyebrow">Growth</p>
      <h1 className="mt-2 font-display text-3xl">Promotions &amp; referrals</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Prepared for future campaigns such as “Refer a friend and get ₦500 off”. Nothing is displayed
        on the storefront in this release, and no discount is ever applied without an enabled campaign.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-3">
          {promotions.length === 0 ? (
            <div className="border border-dashed border-line bg-white px-6 py-12 text-center">
              <p className="font-display text-xl">No campaigns yet</p>
              <p className="mt-2 text-sm text-muted">Create one when you are ready — it stays inactive until enabled.</p>
            </div>
          ) : (
            promotions.map((promotion) => (
              <div key={promotion.id} className="card flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{promotion.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {promotion.promotion_type.replace(/_/g, " ")} ·{" "}
                    {promotion.promotion_type === "fixed_amount" ? formatMoney(promotion.discount_value) : promotion.discount_value}
                    {promotion.promotion_type === "percentage" ? "%" : ""} · {promotion.is_enabled ? "enabled" : "disabled"} · {promotion.is_public ? "public" : "private"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/admin/promotions?edit=${promotion.id}`} className="text-[10px] uppercase tracking-[0.12em] text-burgundy underline underline-offset-4">Edit</Link>
                  <form action={deletePromotionAction}>
                    <input type="hidden" name="promotion_id" value={promotion.id} />
                    <button type="submit" className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-danger">Delete</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        <PromotionForm promotion={editing} />
      </div>
    </AdminShell>
  );
}
