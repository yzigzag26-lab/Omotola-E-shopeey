import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";

export const metadata = { title: "Password recovery", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="font-display text-3xl text-ivory">Corazon</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-gold">Empire</p>
          <h1 className="mt-7 font-display text-2xl text-ivory">Reset your password</h1>
          <p className="mt-2 text-sm text-ivory/55">
            We will email a secure recovery link. The link opens this site and lets you set a new password.
          </p>
        </div>
        <div className="mt-7 bg-ivory p-1">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-[10px] leading-relaxed text-ivory/40">
          If the email does not arrive, check the spam folder and confirm the email provider is
          configured in Supabase Auth (see docs/SETUP.md).
        </p>
        <p className="mt-3 text-center">
          <Link href="/admin" className="text-[10px] uppercase tracking-[0.16em] text-ivory/50 underline underline-offset-4">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
