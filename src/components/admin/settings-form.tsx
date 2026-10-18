"use client";

import { useActionState } from "react";
import { saveSettingsAction, type FormState } from "@/app/admin/catalog-actions";
import type { StoreSettings } from "@/lib/types";

const initial: FormState = { error: null, success: null };

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, initial);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <h2 className="font-display text-xl">Storefront settings</h2>
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="store_name" className="label">Store name</label>
          <input id="store_name" name="store_name" className="field" defaultValue={settings.store_name} required />
        </div>
        <div>
          <label htmlFor="support_email" className="label">Support email</label>
          <input id="support_email" name="support_email" type="email" className="field" defaultValue={settings.support_email} required />
        </div>
        <div>
          <label htmlFor="whatsapp_number" className="label">WhatsApp number</label>
          <input id="whatsapp_number" name="whatsapp_number" className="field" defaultValue={settings.whatsapp_number} required />
          <p className="hint">Digits only, with country code.</p>
        </div>
        <div>
          <label htmlFor="tagline" className="label">Tagline</label>
          <input id="tagline" name="tagline" className="field" defaultValue={settings.tagline ?? ""} />
        </div>
        <div>
          <label htmlFor="instagram_url" className="label">Instagram URL</label>
          <input id="instagram_url" name="instagram_url" className="field" defaultValue={settings.instagram_url ?? ""} placeholder="https://instagram.com/…" />
        </div>
        <div>
          <label htmlFor="tiktok_url" className="label">TikTok URL</label>
          <input id="tiktok_url" name="tiktok_url" className="field" defaultValue={settings.tiktok_url ?? ""} placeholder="https://tiktok.com/@…" />
        </div>
      </div>

      <div className="border border-line bg-ivory px-4 py-3 text-xs text-muted">
        Secrets are never stored here. Email provider keys and the Supabase service-role key live only
        in server environment variables.
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
