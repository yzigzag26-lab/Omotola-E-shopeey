"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type FormState } from "@/app/admin/actions";

const initial: FormState = { error: null, success: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.error ? <p role="alert" className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p role="status" className="border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">{state.success}</p> : null}

      <div>
        <label htmlFor="recovery-email" className="label">Administrator email</label>
        <input id="recovery-email" name="email" type="email" className="field" required defaultValue="omojuli001@gmail.com" autoComplete="username" />
        <p className="hint">Recovery mail is only ever sent to the store&rsquo;s designated administrator address.</p>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send recovery link"}</button>
      <Link href="/admin" className="block text-center text-[10px] uppercase tracking-[0.14em] text-muted underline underline-offset-4">Back to sign in</Link>
    </form>
  );
}
