"use client";

import { useState } from "react";
import { deleteProductAction } from "@/app/admin/product-actions";

export function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-quiet btn-sm border-danger/40 text-danger">
        Delete product
      </button>
    );
  }

  return (
    <form action={deleteProductAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="product_id" value={productId} />
      <p className="text-xs text-danger">Delete “{productName}” permanently?</p>
      <button type="submit" className="btn btn-sm bg-danger text-white">Yes, delete</button>
      <button type="button" onClick={() => setConfirming(false)} className="btn btn-quiet btn-sm">Cancel</button>
    </form>
  );
}
