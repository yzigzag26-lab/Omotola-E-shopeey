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

  it("pins a Node major instead of floating a range", () => {
    const pkg = JSON.parse(read("package.json")) as { engines?: { node?: string } };
    const node = pkg.engines?.node ?? "";
    // Vercel warns when "engines.node" is a range such as ">=20.9.0", because a
    // new major would be adopted automatically.
    expect(node).toMatch(/^\d+(\.\d+)?(\.x)?$/);
    const nvmrc = read(".nvmrc").trim();
    expect(nvmrc.split(".")[0]).toBe(node.split(".")[0]);
  });

  it("keeps admin and API routes explicitly dynamic", () => {
    for (const route of ["src/app/admin/page.tsx", "src/app/api/orders/route.ts", "src/app/sitemap.ts"]) {
      expect(read(route), `${route} should declare force-dynamic`).toContain('export const dynamic = "force-dynamic"');
    }
  });
});
