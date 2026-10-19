/**
 * Environment access with actionable errors.
 *
 * Next.js replaces literal NEXT_PUBLIC_* reads at build time. Server-side
 * database access must prefer a dynamic lookup so hosts that inject env vars
 * only when the app starts (rather than during next build) can still connect.
 * Browser code must continue to use literal reads; it cannot access process.env
 * at runtime. Server secrets are only ever read inside server code.
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export type PublicSupabaseConfig = { url: string; anonKey: string };

// A computed property name is deliberately NOT replaced by Next's build-time
// NEXT_PUBLIC_* substitution. Do not use this helper in client components.
function runtimeEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Server-side only; the browser client uses literal build-time env reads. */
export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL") ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    ?? runtimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();
  if (!config) {
    throw new ConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return config;
}

export function getSiteUrl(): string {
  const configured = runtimeEnv("NEXT_PUBLIC_SITE_URL") ?? process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
}

export type EmailConfig = {
  apiKey: string;
  from: string;
  orderRecipient: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDER_EMAIL_FROM?.trim();
  const orderRecipient = process.env.ORDER_EMAIL_TO?.trim() ?? "omojuli001@gmail.com";
  if (!apiKey || !from) return null;
  return { apiKey, from, orderRecipient };
}

/** Optional. When present, used for server-side order email-status updates. */
export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

/**
 * Sandbox / offline preview only. When enabled and Supabase is unreachable,
 * the storefront renders the bundled demo catalogue with a visible banner.
 * Mutations and admin actions never use this fallback.
 */
export function isOfflineFallbackEnabled(): boolean {
  return process.env.DEMO_OFFLINE_FALLBACK === "1";
}

export const BUSINESS = {
  name: "Corazon Empire",
  adminEmail: "omojuli001@gmail.com",
  whatsappNumber: "2348071334513",
  whatsappDisplay: "+234 807 133 4513",
  orderEmail: "omojuli001@gmail.com",
  currency: "NGN",
  city: "Lagos, Nigeria",
} as const;
