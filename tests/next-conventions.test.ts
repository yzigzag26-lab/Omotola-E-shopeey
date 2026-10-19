import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards for the Next.js 16 conventions that produced build warnings/errors on
 * Vercel. Each assertion corresponds to a line that used to appear in the build
 * log; they are cheap, offline, and fail before a deploy rather than after one.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");
const exists = (relative: string) => existsSync(path.join(ROOT, relative));

describe("Next.js 16 conventions", () => {
  it("uses src/proxy.ts, not the deprecated src/middleware.ts", () => {
    expect(exists("src/middleware.ts"), "src/middleware.ts is deprecated in Next 16 — use src/proxy.ts").toBe(false);
    expect(exists("src/proxy.ts"), "src/proxy.ts is missing").toBe(true);

    const proxy = read("src/proxy.ts");
    // Next requires a default export or a function named "proxy".
    expect(proxy).toMatch(/export\s+(default\s+)?(async\s+)?function\s+proxy\b|export\s+default\s+(async\s+)?function\b/);
    expect(proxy).not.toMatch(/export\s+(async\s+)?function\s+middleware\b/);
    expect(proxy).toContain("matcher");
  });

  it("renders the storefront dynamically instead of abandoning static prerenders", () => {
    const layout = read("src/app/(store)/layout.tsx");
    // Without this, Next tries to prerender cookie-dependent routes and logs a
    // DynamicServerError for each one during `next build`.
    expect(layout).toContain('export const dynamic = "force-dynamic"');
    // Control-flow errors must never be swallowed by the announcement fallback.
    expect(layout).toContain("unstable_rethrow(error)");
  });

  it("declares a bounded Node support window that matches the pinned runtime", () => {
    const pkg = JSON.parse(read("package.json")) as { engines?: { node?: string } };
    const node = pkg.engines?.node ?? "";
    // "22.x" made npm warn (EBADENGINE) on the Node 24 build image, and a bare
    // ">=22" would adopt Node 25 the moment it ships. The window is explicit:
    // 22.12 is Vitest 5's floor, 24 is the hosted builder, 25 is excluded.
    const match = /^>=(\d+)\.(\d+)\.0 <(\d+)$/.exec(node);
    if (!match) {
      throw new Error(`engines.node must be a bounded range such as ">=22.12.0 <25", got "${node}"`);
    }
    const minMajor = Number(match[1]);
    const minMinor = Number(match[2]);
    const maxExclusive = Number(match[3]);
    expect(minMajor).toBe(22);
    expect(minMinor).toBe(12);
    expect(maxExclusive).toBe(25);

    // Both pin files must agree and name a major inside the window.
    const nvmrc = read(".nvmrc").trim();
    expect(read(".node-version").trim()).toBe(nvmrc);
    const pinned = Number(nvmrc.split(".")[0]);
    expect(pinned).toBeGreaterThanOrEqual(minMajor);
    expect(pinned).toBeLessThan(maxExclusive);
  });

  it("keeps admin and API routes explicitly dynamic", () => {
    for (const route of ["src/app/admin/page.tsx", "src/app/api/orders/route.ts", "src/app/sitemap.ts"]) {
      expect(read(route), `${route} should declare force-dynamic`).toContain('export const dynamic = "force-dynamic"');
    }
  });
});
