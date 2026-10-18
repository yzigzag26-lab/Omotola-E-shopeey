import { signOutAction } from "@/app/admin/actions";

export function AccessDenied({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5">
      <div className="w-full max-w-md border border-ivory/15 p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Restricted</p>
        <h1 className="mt-4 font-display text-3xl text-ivory">Not an administrator</h1>
        <p className="mt-3 text-sm leading-relaxed text-ivory/60">
          The account <span className="text-ivory/85">{email}</span> is signed in but is not on the
          administrator allow-list. Sign out and use the store administrator account.
        </p>
        <form action={signOutAction} className="mt-7">
          <button type="submit" className="btn w-full bg-ivory text-ink hover:bg-gold-soft">Sign out</button>
        </form>
      </div>
    </div>
  );
}
