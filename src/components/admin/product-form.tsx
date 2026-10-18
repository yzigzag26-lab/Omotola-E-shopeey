"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveProductAction, type ProductFormState } from "@/app/admin/product-actions";
import { koboToNairaInput } from "@/lib/format/money";
import { slugify } from "@/lib/format/slug";
import type { Category, ProductWithRelations } from "@/lib/types";

const initialState: ProductFormState = { error: null, success: null };

const IMAGE_HELP = "JPEG, PNG or WebP · up to 12 MB · any dimensions (fitted to 4:5 without stretching)";

export function AdminProductForm({
  product,
  categories,
}: {
  product?: ProductWithRelations | null;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product?.slug));
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [previews, setPreviews] = useState<{ front: string | null; back: string | null; additional: string[] }>({
    front: null,
    back: null,
    additional: [],
  });
  const urls = useRef<string[]>([]);

  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const previewFile = (file: File | null, slot: "front" | "back") => {
    if (previews[slot]) URL.revokeObjectURL(previews[slot] as string);
    if (!file) {
      setPreviews((current) => ({ ...current, [slot]: null }));
      return;
    }
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setPreviews((current) => ({ ...current, [slot]: url }));
  };

  const previewAdditional = (files: FileList | null) => {
    previews.additional.forEach((url) => URL.revokeObjectURL(url));
    if (!files) {
      setPreviews((current) => ({ ...current, additional: [] }));
      return;
    }
    const next = Array.from(files).slice(0, 4).map((file) => URL.createObjectURL(file));
    urls.current.push(...next);
    setPreviews((current) => ({ ...current, additional: next }));
  };

  const variantText = (product?.variants ?? [])
    .reduce<Record<string, string[]>>((acc, variant) => {
      acc[variant.kind] = [...(acc[variant.kind] ?? []), variant.value];
      return acc;
    }, {});
  const variantsValue = Object.entries(variantText)
    .map(([kind, values]) => `${kind}: ${values.join(", ")}`)
    .join("\n");

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

      {state.error ? (
        <p role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.success ? (
        <p role="status" className="border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{state.success}</p>
      ) : null}

      <section className="card p-5" aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-display text-xl">Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="label">Product name <span className="text-burgundy">*</span></label>
            <input
              id="name"
              name="name"
              className="field"
              required
              minLength={2}
              maxLength={140}
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugEdited) setSlug(slugify(value));
              }}
            />
          </div>

          <div>
            <label htmlFor="slug" className="label">URL slug <span className="text-burgundy">*</span></label>
            <input
              id="slug"
              name="slug"
              className="field"
              required
              value={slug}
              onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }}
              onBlur={() => { if (!slug.trim()) { setSlugEdited(false); setSlug(slugify(name)); } }}
            />
            <p className="hint">/product/{slug || "your-product"}</p>
          </div>

          <div>
            <label htmlFor="category_id" className="label">Category <span className="text-burgundy">*</span></label>
            <select id="category_id" name="category_id" className="field" required defaultValue={product?.category_id ?? ""}>
              <option value="" disabled>Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="label">Description <span className="text-burgundy">*</span></label>
            <textarea id="description" name="description" className="field min-h-32" rows={5} required
              defaultValue={product?.description ?? ""} />
          </div>

          <div>
            <label htmlFor="price" className="label">Price (₦) <span className="text-burgundy">*</span></label>
            <input id="price" name="price" className="field" inputMode="decimal" required
              defaultValue={product ? koboToNairaInput(product.price_kobo) : ""} placeholder="18500" />
            <p className="hint">Stored as integer kobo — no rounding drift.</p>
          </div>

          <div>
            <label htmlFor="availability" className="label">Availability</label>
            <select id="availability" name="availability" className="field" defaultValue={product?.availability ?? "available"}>
              <option value="available">Available — confirmed on order</option>
              <option value="made_to_order">Made to order</option>
              <option value="temporarily_unavailable">Temporarily unavailable</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="label">Publication</label>
            <select id="status" name="status" className="field" defaultValue={product?.status ?? "draft"}>
              <option value="draft">Draft — hidden</option>
              <option value="published">Published — live</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input id="is_featured" name="is_featured" type="checkbox" className="h-4 w-4 accent-burgundy"
              checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
            <label htmlFor="is_featured" className="text-sm text-ink-soft">Feature on the home page</label>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="variants" className="label">Options <span className="text-muted">(optional)</span></label>
            <textarea id="variants" name="variants" className="field min-h-20" rows={3}
              defaultValue={variantsValue} placeholder={"Size: S, M, L, XL\nColour: Burgundy, Ivory"} />
            <p className="hint">One line per option type. Leave blank for products without options.</p>
          </div>

          <div>
            <label htmlFor="seo_title" className="label">SEO title <span className="text-muted">(optional)</span></label>
            <input id="seo_title" name="seo_title" className="field" maxLength={70} defaultValue={product?.seo_title ?? ""} />
          </div>
          <div>
            <label htmlFor="seo_description" className="label">SEO description <span className="text-muted">(optional)</span></label>
            <input id="seo_description" name="seo_description" className="field" maxLength={200} defaultValue={product?.seo_description ?? ""} />
          </div>
        </div>
      </section>

      <section className="card p-5" aria-labelledby="images-upload-heading">
        <h2 id="images-upload-heading" className="font-display text-xl">Product photography</h2>
        <p className="mt-1 text-xs text-muted">{IMAGE_HELP}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ImageField id="front_image" label="Front image" onChange={previewFile} preview={previews.front} slot="front" />
          <ImageField id="back_image" label="Back image" onChange={previewFile} preview={previews.back} slot="back" />
        </div>
        <div className="mt-5">
          <label htmlFor="additional_images" className="label">Additional images <span className="text-muted">(optional)</span></label>
          <input
            id="additional_images"
            name="additional_images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => previewAdditional(event.target.files)}
            className="block w-full border border-line bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ivory-deep file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.1em]"
          />
          {previews.additional.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.additional.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${url}-${index}`} src={url} alt={`Additional preview ${index + 1}`} className="h-24 w-20 border border-line object-contain" />
              ))}
            </div>
          ) : null}
        </div>
        {product ? (
          <p className="mt-4 text-xs text-muted">
            Existing images are managed below — replace a role by uploading a new file and saving.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        <Link href="/admin/products" className="btn btn-quiet">Cancel</Link>
      </div>
    </form>
  );
}

function ImageField({
  id,
  label,
  preview,
  onChange,
  slot,
}: {
  id: string;
  label: string;
  preview: string | null;
  onChange: (file: File | null, slot: "front" | "back") => void;
  slot: "front" | "back";
}) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        name={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => onChange(event.target.files?.[0] ?? null, slot)}
        className="block w-full border border-line bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ivory-deep file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.1em]"
      />
      {preview ? (
        <div className="mt-3 flex items-start gap-3">
          <div className="relative aspect-[4/5] w-24 border border-line bg-ivory-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-contain" />
          </div>
          <p className="text-xs text-muted">Preview — the saved image is fitted to the same 4:5 area without distortion.</p>
        </div>
      ) : null}
    </div>
  );
}
