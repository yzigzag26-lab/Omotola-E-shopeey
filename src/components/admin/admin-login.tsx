"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type LoginState } from "@/app/admin/actions";

const initialState: LoginState = { error: null };

export function AdminLogin() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-3xl text-ivory">Corazon</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-gold">Empire</p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-ivory/50">Administrator access</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4 border border-ivory/15 bg-ivory/[0.03] p-6 backdrop-blur">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-ivory/60">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue="omojuli001@gmail.com"
              className="w-full border border-ivory/20 bg-transparent px-3 py-2.5 text-sm text-ivory placeholder:text-ivory/30 focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-ivory/60">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full border border-ivory/20 bg-transparent px-3 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
            />
          </div>

          {state.error ? (
            <p role="alert" className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#f0b8b8]">
              {state.error}
            </p>
          ) : null}

          <button type="submit" className="btn w-full bg-ivory text-ink hover:bg-gold-soft" disabled={pending}>
            {pending ? "Checking…" : "Sign in"}
          </button>

          <div className="flex items-center justify-between pt-1 text-[10px] uppercase tracking-[0.14em] text-ivory/50">
            <Link href="/admin/forgot-password" className="hover:text-gold">Forgot password</Link>
            <Link href="/" className="hover:text-gold">Back to store</Link>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-ivory/35">
          Authorised staff only. Sessions are verified on the server for every admin action.
        </p>
      </div>
    </div>
  );
}
