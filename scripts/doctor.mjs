#!/usr/bin/env node
/**
 * Offline configuration doctor.
 *
 * Checks that the environment and the bundled demo catalogue are consistent,
 * WITHOUT contacting Supabase or Resend. Run it after copying `.env.example`
 * to `.env.local` and again on the host that will run the app.
 *
 *   npm run doctor
 *
 * Secret values are never printed — only whether they are set, their length and
 * the non-secret claims of a JWT (role, project ref, expiry).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const results = [];
const ok = (check, detail) => results.push({ status: "pass", check, detail });
const warn = (check, detail) => results.push({ status: "warn", check, detail });
const fail = (check, detail) => results.push({ status: "fail", check, detail });

/** Minimal .env reader — Next.js loads these at runtime, plain node does not. */
function loadDotEnv() {
  const loaded = [];
  for (const name of [".env.local", ".env"]) {
    if (!existsSync(name)) continue;
    for (const raw of readFileSync(name, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
    loaded.push(name);
  }
  return loaded;
}

/** "set (43 chars)" / "missing" — never the value itself. */
function presence(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `set (${trimmed.length} chars)`;
}

function jwtClaims(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return { role: payload.role, ref: payload.ref, exp: payload.exp };
  } catch {
    return null;
  }
}

function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) ok("node version", `v${process.versions.node}`);
  else fail("node version", `v${process.versions.node} — >=20.9.0 required`);
}

function checkEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL", "missing — storefront cannot reach the database");
  else if (!/^https:\/\/[a-z0-9-]+\.(supabase\.co|supabase\.in)$/i.test(url))
    warn("NEXT_PUBLIC_SUPABASE_URL", `${url.replace(/^https:\/\//, "")} — expected a https project URL`);
  else ok("NEXT_PUBLIC_SUPABASE_URL", url);

  if (!anon) fail("NEXT_PUBLIC_SUPABASE_ANON_KEY", "missing — storefront cannot read published products");
  else ok("NEXT_PUBLIC_SUPABASE_ANON_KEY", presence(anon));

  // The one mistake worth blocking loudly: a service-role key in a public var.
  for (const name of Object.keys(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;
    const claims = jwtClaims(process.env[name] ?? "");
    if (claims?.role === "service_role") {
      fail(`${name}`, "holds a service_role key — it would be inlined into the browser bundle. Unset it immediately and rotate the key.");
    }
  }

  const serviceClaims = service ? jwtClaims(service) : null;
  if (!service) warn("SUPABASE_SERVICE_ROLE_KEY", "missing — seed/upload/provision/verify scripts cannot run (app still works)");
  else if (serviceClaims?.role !== "service_role")
    fail("SUPABASE_SERVICE_ROLE_KEY", `present but its role claim is ${serviceClaims?.role ?? "unparseable"}, not service_role`);
  else ok("SUPABASE_SERVICE_ROLE_KEY", `${presence(service)}, role=service_role${serviceClaims.ref ? `, ref=${serviceClaims.ref}` : ""}`);

  if (serviceClaims?.exp) {
    const days = Math.round((serviceClaims.exp * 1000 - Date.now()) / 86_400_000);
    if (days < 0) fail("service key expiry", `expired ${Math.abs(days)} day(s) ago — rotate it in the dashboard`);
    else if (days < 30) warn("service key expiry", `expires in ${days} day(s)`);
    else ok("service key expiry", `${days} day(s) remaining`);
  }
}

function checkEmail() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ORDER_EMAIL_FROM?.trim();
  const to = process.env.ORDER_EMAIL_TO?.trim() || "omojuli001@gmail.com";
  if (apiKey && from) {
    ok("email ordering", `enabled — ${from} → ${to}`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from.replace(/^.*<|>$/g, "")))
      warn("ORDER_EMAIL_FROM", "does not look like an email address or Name <email> pair");
  } else {
    warn(
      "email ordering",
      `disabled (${apiKey ? "ORDER_EMAIL_FROM missing" : "RESEND_API_KEY missing"}) — /api/orders returns 503 EMAIL_NOT_CONFIGURED and customers are routed to WhatsApp`,
    );
  }
  if (process.env.DEMO_OFFLINE_FALLBACK === "1")
    warn("DEMO_OFFLINE_FALLBACK", "enabled — fine for a sandbox preview, must be unset in production");
}

function checkSecretHygiene() {
  let tracked = [];
  try {
    tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    warn("git", "not a git checkout — skipped tracked-secret check");
    return;
  }
  // .gitignore allowlists these two templates; anything else .env* is a leak.
  const TEMPLATES = new Set([".env.example", ".env.test.example"]);
  const committed = tracked.filter(
    (file) =>
      !TEMPLATES.has(file) && (file === ".env" || file.startsWith(".env.") || file.includes("credentials")),
  );
  if (committed.length > 0) fail("tracked env files", committed.join(", "));
  else ok("tracked env files", "only the .env.example template is committed");
}

function checkCatalog() {
  const catalogPath = path.join("supabase", "seed", "demo-catalog.json");
  if (!existsSync(catalogPath)) {
    fail("demo catalogue", `${catalogPath} is missing`);
    return;
  }
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const variants = catalog.products.reduce((total, product) => total + (product.variants?.length ?? 0), 0);
  const images = catalog.products.flatMap((product) => product.images ?? []);

  const expected = { categories: 8, products: 8, images: 16 };
  const actual = {
    categories: catalog.categories.length,
    products: catalog.products.length,
    images: images.length,
  };
  for (const key of Object.keys(expected)) {
    if (actual[key] === expected[key]) ok(`catalogue ${key}`, String(actual[key]));
    else fail(`catalogue ${key}`, `${actual[key]} — expected ${expected[key]}`);
  }
  ok("catalogue variants", String(variants));

  const categoryIds = new Set(catalog.categories.map((category) => category.id));
  for (const product of catalog.products) {
    if (!categoryIds.has(product.category_id)) fail(`category link`, `${product.slug} points at unknown category ${product.category_id}`);
  }

  let missing = 0;
  for (const image of images) {
    for (const suffix of [".jpg", "-thumb.jpg"]) {
      const file = path.join("public", "products", `${image.file}${suffix}`);
      if (!existsSync(file)) {
        missing += 1;
        fail("image asset", `catalogue references ${file}, which is not in the repository`);
      }
    }
  }
  if (missing === 0) ok("image assets", `${images.length * 2} files present for ${images.length} image records`);

  const crops = images.filter((image) => image.role === "additional").length;
  if (crops > 0)
    warn("gallery imagery", `${crops} product(s) use a labelled detail crop as their second image — replace with real back-view photography`);
}

const loaded = loadDotEnv();
console.log(`Corazon Empire — configuration doctor${loaded.length ? ` (loaded ${loaded.join(", ")})` : " (no .env.local found)"}`);
console.log("Reads local configuration only; makes no network calls.\n");

checkNode();
checkEnv();
checkEmail();
checkSecretHygiene();
checkCatalog();

const icon = { pass: "✓", warn: "!", fail: "✗" };
for (const result of results) console.log(`${icon[result.status]} ${result.check}: ${result.detail}`);

const failures = results.filter((result) => result.status === "fail").length;
const warnings = results.filter((result) => result.status === "warn").length;
console.log(`\n${failures} blocking, ${warnings} advisory.`);
if (failures === 0 && warnings === 0) console.log("Ready.");
else if (failures === 0) console.log("Usable — review the advisory items before going live.");
process.exit(failures === 0 ? 0 : 1);
