"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCategoryAction, type FormState } from "@/app/admin/catalog-actions";
import type { Category } from "@/lib/types";

const initial: FormState = { error: null, success: null };

export function CategoryForm({ category }: { category?: Category | null }) {
  const [state, formAction, pending] = useActionState(saveCategoryAction, initial);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      {category ? <input type="hidden" name="category_id" value={category.id} /> : null}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{category ? `Edit ${category.name}` : "Add a category"}</h2>
        {category ? <Link href="/admin/categories" className="text-[10px] uppercase tracking-[0.12em] text-muted underline underline-offset-4">Cancel</Link> : null}
      </div>

      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category-name" className="label">Name <span className="text-burgundy">*</span></label>
          <input id="category-name" name="name" className="field" required defaultValue={category?.name ?? ""} />
        </div>
        <div>
          <label htmlFor="category-slug" className="label">Slug</label>
          <input id="category-slug" name="slug" className="field" defaultValue={category?.slug ?? ""} placeholder="auto from name" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="category-description" className="label">Description</label>
          <textarea id="category-description" name="description" className="field min-h-20" rows={2} defaultValue={category?.description ?? ""} />
        </div>
        <div>
          <label htmlFor="display_order" className="label">Display order</label>
          <input id="display_order" name="display_order" type="number" min={0} max={999} className="field" defaultValue={category?.display_order ?? 0} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input id="is_active" name="is_active" type="checkbox" className="h-4 w-4 accent-burgundy" defaultChecked={category?.is_active ?? true} />
          <label htmlFor="is_active" className="text-sm text-ink-soft">Visible on the storefront</label>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : category ? "Save category" : "Add category"}
      </button>
    </form>
  );
}
