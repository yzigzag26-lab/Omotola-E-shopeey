"use client";

import { useState } from "react";
import { deleteProductImageAction, reorderProductImageAction } from "@/app/admin/product-actions";
import type { ProductImage } from "@/lib/types";

export function ImageManager({ productId, images }: { productId: string; images: ProductImage[] }) {
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
  const hasFront = sorted.some((image) => image.role === "front");
  const hasBack = sorted.some((image) => image.role === "back");

  return (
    <section className="card p-5" aria-labelledby="images-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="images-heading" className="font-display text-xl">Images</h2>
          <p className="mt-1 text-xs text-muted">
            Uploads of any size or shape are fitted into the 4:5 display area without stretching.
            Replacing a front or back image keeps its role.
          </p>
        </div>
        <div className="flex gap-2 text-[10px] uppercase tracking-[0.12em]">
          <span className={`border px-2 py-1 ${hasFront ? "border-success/40 text-success" : "border-danger/40 text-danger"}`}>
            Front {hasFront ? "set" : "missing"}
          </span>
          <span className={`border px-2 py-1 ${hasBack ? "border-success/40 text-success" : "border-danger/40 text-danger"}`}>
            Back {hasBack ? "set" : "missing"}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-5 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No images yet. Upload a front image above, then the back view.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((image, index) => (
            <li key={image.id} className="border border-line bg-white">
              <div className="relative aspect-[4/5] bg-ivory-deep">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.image_url_thumb ?? image.image_url} alt={image.alt_text} className="h-full w-full object-contain" />
                <span className="absolute left-2 top-2 bg-ink/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-ivory">
                  {image.role}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-2">
                <div className="flex gap-1">
                  <form action={reorderProductImageAction}>
                    <input type="hidden" name="image_id" value={image.id} />
                    <input type="hidden" name="product_id" value={productId} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={index === 0} aria-label="Move image earlier" className="border border-line px-2 py-1 text-xs disabled:opacity-30">←</button>
                  </form>
                  <form action={reorderProductImageAction}>
                    <input type="hidden" name="image_id" value={image.id} />
                    <input type="hidden" name="product_id" value={productId} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={index === sorted.length - 1} aria-label="Move image later" className="border border-line px-2 py-1 text-xs disabled:opacity-30">→</button>
                  </form>
                </div>
                <DeleteImageButton imageId={image.id} productId={productId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteImageButton({ imageId, productId }: { imageId: string; productId: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-danger">
        Remove
      </button>
    );
  }
  return (
    <form action={deleteProductImageAction} className="flex items-center gap-1">
      <input type="hidden" name="image_id" value={imageId} />
      <input type="hidden" name="product_id" value={productId} />
      <button type="submit" className="text-[10px] uppercase tracking-[0.12em] text-danger">Confirm</button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[10px] uppercase tracking-[0.12em] text-muted">No</button>
    </form>
  );
}
