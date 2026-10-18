"use client";

import { useActionState } from "react";
import { updateOrderAction, type FormState } from "@/app/admin/catalog-actions";

const initial: FormState = { error: null, success: null };

export function OrderUpdateForm({
  orderId,
  status,
  deliveryFeeNaira,
}: {
  orderId: string;
  status: string;
  deliveryFeeNaira: string;
}) {
  const [state, formAction, pending] = useActionState(updateOrderAction, initial);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <input type="hidden" name="order_id" value={orderId} />
      <h2 className="font-display text-xl">Update order</h2>
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div>
        <label htmlFor="order-status" className="label">Status</label>
        <select id="order-status" name="status" className="field" defaultValue={status}>
          <option value="pending_review">Pending review</option>
          <option value="confirmed">Confirmed</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label htmlFor="delivery_fee" className="label">Confirmed delivery fee (₦)</label>
        <input id="delivery_fee" name="delivery_fee" className="field" inputMode="decimal" defaultValue={deliveryFeeNaira} placeholder="e.g. 2500 — leave blank if not confirmed" />
        <p className="hint">Only enter a fee once it has actually been agreed with the customer.</p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save order"}</button>
    </form>
  );
}
