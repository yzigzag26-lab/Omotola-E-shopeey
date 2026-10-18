"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction, type FormState } from "@/app/admin/actions";

const initial: FormState = { error: null, success: null };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initial);

  if (state.success) {
    return (
      <div className="card space-y-4 p-6">
        <p className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p>
        <Link href="/admin" className="btn btn-primary w-full">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}

      <div>
        <label htmlFor="new-password" className="label">New password</label>
        <input id="new-password" name="password" type="password" className="field" required minLength={8} autoComplete="new-password" />
        <p className="hint">At least 8 characters, including a letter and a number.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="label">Confirm password</label>
        <input id="confirm-password" name="confirm" type="password" className="field" required minLength={8} autoComplete="new-password" />
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}
