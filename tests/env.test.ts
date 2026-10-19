import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationError, getPublicSupabaseConfig, getSiteUrl, requirePublicSupabaseConfig } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("server Supabase configuration", () => {
  it("fails clearly when neither URL nor publishable key is available", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(getPublicSupabaseConfig()).toBeNull();
    expect(() => requirePublicSupabaseConfig()).toThrow(ConfigurationError);
  });

  it("reads public settings from the runtime environment", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " public-test-key ");
    expect(requirePublicSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "public-test-key",
    });
  });

  it("accepts the alternative publishable key variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-alternative");
    expect(requirePublicSupabaseConfig().anonKey).toBe("public-alternative");
  });

  it("uses the runtime origin for recovery links", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com/");
    expect(getSiteUrl()).toBe("https://shop.example.com");
  });
});
