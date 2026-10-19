import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  SETUP_SQL_RELATIVE_PATH,
  SOURCES,
  buildSetupSql,
  driftDescription,
} from "../scripts/build-setup-sql.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const committed = readFileSync(path.join(ROOT, SETUP_SQL_RELATIVE_PATH), "utf8");

describe("one-paste setup.sql", () => {
  it("matches its sources exactly", () => {
    const expected = buildSetupSql(ROOT);
    expect(driftDescription(expected, committed), driftDescription(expected, committed) ?? "").toBeNull();
  });

  it("detects drift when a source changes (negative control)", () => {
    // A guard that can only pass proves nothing: prove it fails when it should.
    const expected = buildSetupSql(ROOT).replace("price_kobo > 0", "price_kobo >= 0");
    expect(driftDescription(expected, committed)).toContain("out of date");
    expect(driftDescription(expected, committed)).toContain("line ");
  });

  it("includes every migration and seed verbatim, in dependency order", () => {
    let previous = -1;
    for (const source of SOURCES) {
      const body = readFileSync(path.join(ROOT, source.relativePath), "utf8").trim();
      const position = committed.indexOf(body);
      expect(position, `${source.relativePath} missing from setup.sql`).toBeGreaterThan(-1);
      expect(position, `${source.relativePath} is out of order`).toBeGreaterThan(previous);
      expect(committed.split(body)).toHaveLength(2);
      previous = position;
    }
  });

  it("covers the four migrations before the seed", () => {
    const migrations = SOURCES.filter((source) => source.relativePath.includes("/migrations/"));
    const seeds = SOURCES.filter((source) => source.relativePath.includes("/seed/"));
    expect(migrations).toHaveLength(4);
    expect(seeds).toHaveLength(1);
    expect(committed.indexOf("insert into public.categories")).toBeGreaterThan(
      committed.indexOf("grant execute on function public.submit_order"),
    );
  });

  it("names the administrator and never contains a password", () => {
    expect(committed).toContain(ADMIN_EMAIL);
    expect(committed).toContain("insert into public.admin_users");
    expect(committed).toContain("'role', 'admin'");
    // No credential material belongs in a file that gets pasted into a chat.
    expect(committed).not.toMatch(/password\s*:?=/i);
    expect(committed).not.toMatch(/TEMP-PASSWORD-CHANGE-ME/i);
  });

  it("carries every verification check", () => {
    for (const marker of ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7"]) {
      expect(committed, `check ${marker} missing`).toContain(`-- ${marker}`);
    }
    expect(committed).toContain("from pg_tables\n where schemaname = 'public'\n   and not rowsecurity");
    expect(committed).toContain("has_table_privilege('anon', 'public.orders', 'select')");
    expect(committed).toContain("storage.buckets");
  });

  it("states that it is generated", () => {
    expect(committed).toContain("GENERATED FILE");
    expect(committed).toContain("npm run setup:sql");
  });
});
