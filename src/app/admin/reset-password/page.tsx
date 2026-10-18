import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="font-display text-3xl text-ivory">Corazon</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-gold">Empire</p>
          <h1 className="mt-7 font-display text-2xl text-ivory">Choose a new password</h1>
        </div>

        <div className="mt-7 bg-ivory p-1">
          {user ? (
            <ResetPasswordForm />
          ) : (
            <div className="card space-y-4 p-6 text-center">
              <p className="text-sm text-ink-soft">
                This recovery link is invalid or has expired. Request a fresh link to continue.
              </p>
              <Link href="/admin/forgot-password" className="btn btn-primary w-full">Request a new link</Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-ivory/40">
          You will be signed out after the password is changed, then sign in with the new password.
        </p>
      </div>
    </div>
  );
}
