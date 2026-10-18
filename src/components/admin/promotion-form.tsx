"use client";

import { useActionState, useState } from "react";
import { savePromotionAction, type FormState } from "@/app/admin/catalog-actions";
import type { Promotion } from "@/lib/types";

const initial: FormState = { error: null, success: null };

export function PromotionForm({ promotion }: { promotion?: Promotion | null }) {
  const [state, formAction, pending] = useActionState(savePromotionAction, initial);
  const [enabled, setEnabled] = useState(promotion?.is_enabled ?? false);
  const [isPublic, setIsPublic] = useState(promotion?.is_public ?? false);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      {promotion ? <input type="hidden" name="promotion_id" value={promotion.id} /> : null}
      <h2 className="font-display text-xl">{promotion ? "Edit promotion" : "New promotion"}</h2>
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="promo-name" className="label">Campaign name</label>
          <input id="promo-name" name="name" className="field" required defaultValue={promotion?.name ?? ""} placeholder="Refer a friend and get ₦500 off" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="promo-description" className="label">Description</label>
          <textarea id="promo-description" name="description" className="field min-h-16" rows={2} defaultValue={promotion?.description ?? ""} />
        </div>
        <div>
          <label htmlFor="promotion_type" className="label">Type</label>
          <select id="promotion_type" name="promotion_type" className="field" defaultValue={promotion?.promotion_type ?? "referral"}>
            <option value="percentage">Percentage discount</option>
            <option value="fixed_amount">Fixed amount</option>
            <option value="referral">Referral reward</option>
            <option value="free_delivery">Free delivery</option>
          </select>
        </div>
        <div>
          <label htmlFor="discount_value" className="label">Discount value</label>
          <input id="discount_value" name="discount_value" type="number" min={0} className="field" defaultValue={promotion?.discount_value ?? 0} />
          <p className="hint">Percent for percentage campaigns, kobo for fixed amounts.</p>
        </div>
        <div>
          <label htmlFor="start_at" className="label">Starts</label>
          <input id="start_at" name="start_at" type="datetime-local" className="field" defaultValue={promotion?.start_at?.slice(0, 16) ?? ""} />
        </div>
        <div>
          <label htmlFor="end_at" className="label">Ends</label>
          <input id="end_at" name="end_at" type="datetime-local" className="field" defaultValue={promotion?.end_at?.slice(0, 16) ?? ""} />
        </div>
        <div>
          <label htmlFor="referral_code" className="label">Referral code</label>
          <input id="referral_code" name="referral_code" className="field" defaultValue={promotion?.referral_code ?? ""} />
        </div>
        <div className="flex flex-col gap-2 pt-6">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input name="is_enabled" type="checkbox" className="h-4 w-4 accent-burgundy" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input name="is_public" type="checkbox" className="h-4 w-4 accent-burgundy" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Public
          </label>
        </div>
      </div>

      {enabled && isPublic ? (
        <p className="border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          Enabling a public campaign is blocked in this release: no public promotion UI is shipped yet.
        </p>
      ) : (
        <p className="border border-line bg-ivory px-3 py-2 text-xs text-muted">
          Promotions are stored for future campaigns and are inactive on the storefront by default.
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save promotion"}</button>
    </form>
  );
}
