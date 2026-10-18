"use client";

import { useActionState, useState } from "react";
import { saveAnnouncementAction, type FormState } from "@/app/admin/catalog-actions";
import type { Announcement } from "@/lib/types";

const initial: FormState = { error: null, success: null };

export function AnnouncementForm({ announcement }: { announcement: Announcement | null }) {
  const [state, formAction, pending] = useActionState(saveAnnouncementAction, initial);
  const [message, setMessage] = useState(announcement?.message ?? "");
  const [enabled, setEnabled] = useState(announcement?.is_enabled ?? false);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <h2 className="font-display text-xl">Current announcement</h2>
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div>
        <label htmlFor="announcement-message" className="label">Message</label>
        <textarea
          id="announcement-message"
          name="message"
          className="field min-h-24"
          rows={3}
          maxLength={280}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="A short line that scrolls across the top of the storefront."
        />
        <p className="hint">{message.length}/280 characters</p>
      </div>

      <div className="flex items-center gap-3">
        <input id="is_enabled" name="is_enabled" type="checkbox" className="h-4 w-4 accent-burgundy" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <label htmlFor="is_enabled" className="text-sm text-ink-soft">Show on the storefront</label>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save announcement"}</button>
      <p className="text-xs text-muted">
        There is exactly one announcement. Saving replaces the current message; disabling hides the
        marquee entirely.
      </p>
    </form>
  );
}
