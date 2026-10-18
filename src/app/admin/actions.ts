"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl, BUSINESS } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type LoginState = { error: string | null };
export type FormState = { error: string | null; success: string | null };

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Incorrect password" };

  const { email, password } = parsed.data;
  const limit = rateLimit(`login:${email.toLowerCase()}`, 6, 5 * 60_000);
  if (!limit.allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Deliberately identical for unknown accounts and wrong passwords.
    if (error?.status === 429) {
      return { error: "Too many attempts. Please wait a few minutes and try again." };
    }
    return { error: "Incorrect password" };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "This account does not have administrator access." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/admin");
  redirect("/admin");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Only the designated store administrator may trigger recovery mail, so this
  // endpoint cannot be used to send messages to arbitrary addresses.
  if (email !== BUSINESS.adminEmail.toLowerCase()) {
    return {
      error: null,
      success: "If that address belongs to the store administrator, a recovery link has been sent.",
    };
  }

  const limit = rateLimit(`recovery:${email}`, 3, 15 * 60_000);
  if (!limit.allowed) {
    return { error: "A recovery email was requested recently. Please wait 15 minutes before trying again.", success: null };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/admin/reset-password`,
  });

  if (error) {
    console.error("[auth] password recovery request failed", { status: error.status });
    return {
      error: "We could not send the recovery email. The mail service may not be configured yet — see SETUP.md.",
      success: null,
    };
  }

  return {
    error: null,
    success: "If that address belongs to the store administrator, a recovery link has been sent. Check the inbox and spam folder.",
  };
}

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200)
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "The passwords do not match.", success: null };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password.", success: null };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A valid recovery/user session is required; no custom token flow is offered.
  if (!user) {
    return { error: "Your recovery session has expired. Request a new link.", success: null };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.error("[auth] password update failed", { status: error.status });
    return { error: "The password could not be updated. Request a new recovery link.", success: null };
  }

  await supabase.auth.signOut();
  return { error: null, success: "Password updated. You can now sign in with your new password." };
}
