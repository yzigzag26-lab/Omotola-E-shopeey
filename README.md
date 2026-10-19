# Corazon Empire

A complete, production-oriented e-commerce storefront and admin dashboard for **Corazon Empire** — a
Lagos-based fashion, accessories and home house. Built with Next.js (App Router), TypeScript, Tailwind
CSS v4 and Supabase (Postgres, Auth, Storage, RLS).

- **Storefront:** home, shop with search/filter/sort/pagination, eight category pages, dynamic product
  pages with front/back galleries, guest cart, WhatsApp ordering, and secure email ordering.
- **Admin dashboard:** `/admin` with authentication, overview, product CRUD, image uploads with
  automatic 4:5 fitting, categories, orders, the single announcement marquee, promotions (inactive by
  design) and store settings.
- **Backend:** version-controlled SQL migrations, Row Level Security, a transactional order RPC, and
  server-side price/availability validation.

> Demo catalogue prices are illustrative and freely editable in the dashboard.

---

## Architecture

```
Browser
  ├─ Storefront (Server Components, revalidated on admin writes)
  │    └─ Supabase JS (publishable key, cookie session) ── RLS
  ├─ Cart (localStorage, guest — no account required)
  └─ POST /api/orders (Route Handler, server-only)
       ├─ Zod validation + in-memory rate limit
       ├─ Pre-flight catalogue/variant validation
       ├─ supabase.rpc('submit_order')  ── one transaction, DB-authoritative prices
       └─ Resend email notification (email channel only)

Admin
  └─ /admin (Supabase Auth + admin_users allow-list)
       ├─ Server Actions (every action re-checks is_admin() on the server)
       └─ Supabase Storage (sharp-normalised 1600×2000 + 640×800 JPEGs)
```

Money is stored as **integer kobo** (`₦1 = 100 kobo`). Nothing in the app performs floating-point
arithmetic on money.

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 22 LTS (pinned by `.nvmrc`/`.node-version`; Node 24 build images supported) |
| Framework | Next.js 16 (App Router, Server Actions, proxy) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS v4 with brand tokens in `src/app/globals.css` |
| Database | Supabase Postgres 17, SQL migrations, RLS |
| Auth | Supabase Auth (email/password, recovery links) |
| Storage | Supabase Storage, public-read `product-images` bucket, admin-only writes |
| Images | `sharp` — EXIF rotate, `contain` fit into 4:5, never stretched |
| Email | Resend (optional; email ordering disabled cleanly when unset) |
| Tests | Vitest (pure logic, seed integrity, validation) |

## Quick start

```bash
# 1. Install on Node 22.12+ (nvm use picks up .nvmrc)
npm install

# 2. Configure
cp .env.example .env.local      # fill in Supabase URL + publishable key
#   optional: RESEND_API_KEY / ORDER_EMAIL_FROM for email ordering
npm run hooks:install           # block commits that contain credentials
npm run doctor                  # offline check of your env vars and the catalogue

# 3. Apply the database schema — three ways, see docs/SETUP.md
#    supabase/setup.sql          — one paste into the Supabase SQL Editor (no tooling needed)
#    npx supabase db push        — or apply supabase/migrations/*.sql in filename order

# 4. Seed the demo catalogue (uses the service-role key)
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed

# 5. Provision the administrator
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_EMAIL=omojuli001@gmail.com ADMIN_INITIAL_PASSWORD='…' npm run provision-admin

# 6. Run
npm run dev          # http://localhost:3000  ·  admin at /admin
```

Full setup, storage, auth and email configuration: **[docs/SETUP.md](docs/SETUP.md)**.
Deployment: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.
Image behaviour: **[docs/IMAGE_PIPELINE.md](docs/IMAGE_PIPELINE.md)**.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm run lint:secrets` | Fail if a credential-like value appears in a tracked file |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite |
| `npm run verify` | Secret scan + typecheck + lint + tests + build (also runs in CI) |
| `npm run doctor` | Offline configuration check: env vars, catalogue and image assets |
| `npm run hooks:install` | Enable the pre-commit credential scan |
| `npm run seed` | Idempotent demo catalogue seed (service role) |
| `npm run seed:sql` | Regenerate the SQL seed files from `demo-catalog.json` |
| `npm run setup:sql` | Regenerate `supabase/setup.sql` from the migrations and the seed |
| `npm run upload-images` | Upload demo photography to Supabase Storage and repoint records |
| `npm run provision-admin` | Create/update the admin account and allow-list entry |
| `npm run verify:db` | Read-only production sanity check |
| `node scripts/process-images.mjs` | Rebuild 4:5 display + thumbnail JPEGs from `public/products/_raw` |

## Project structure

```
src/
  app/
    (store)/            # Public storefront (shared header/footer/cart)
      page.tsx          # Home
      shop/             # Search, filters, sorting, pagination
      category/[slug]/  # Dynamic categories
      product/[slug]/   # Dynamic product pages (gallery, variants, WhatsApp)
      cart/             # Guest cart + checkout
      about|contact|privacy|terms
    admin/              # Dashboard + auth screens (noindex)
    api/orders/         # Secure order submission
    auth/callback/      # Supabase code exchange for recovery links
  components/
    storefront/         # Header, footer, marquee, cart, product UI
    admin/              # Shell, forms, image manager
    ui/                 # ProductImage, Price, Badge, EmptyState
  lib/
    data/               # Server-side catalogue queries
    demo/               # Bundled seed catalogue (explicit offline preview only)
    orders/             # WhatsApp builder, email template, submission service
    images/             # sharp processing + storage upload
    supabase/           # Browser/server/service-role clients + DB types
    validation/         # Zod schemas
supabase/
  setup.sql             # generated: every migration + seed + admin grant + verification
  migrations/           # 4 ordered SQL migrations
  seed/demo-catalog.json# Single source of truth for the demo catalogue
scripts/                # Seed, upload, provisioning, verification, image pipeline
tests/                  # Vitest suites
```

## Security notes

- Every admin page and server action independently calls `is_admin()` against the database. RLS also
  enforces admin checks, so the UI is never the security boundary.
- Public visitors can read only active categories, published products, their images/variants, the
  enabled announcement and store settings. `orders` and `order_items` have **no** anonymous access.
- Orders are created only through `submit_order()`, a `SECURITY DEFINER` function that re-reads prices
  and publication status inside the transaction. Idempotency keys prevent duplicate orders.
- The service-role key is server-only and optional at runtime; email status updates degrade with a
  logged warning rather than exposing the key.
- Rate limiting is in-memory per instance (login, recovery, order submission). Add platform-level rate
  limiting for high-traffic deployments.
- No payment data is collected. No security audit is claimed.

### Known environment limitation

The sandbox used to build this repository has **no outbound network access to Supabase or Resend** — only
`github.com`, `api.github.com`, `registry.npmjs.org` and `files.pythonhosted.org` are reachable. DNS for
`*.supabase.co` does not resolve there at all, so no key changes that: anything touching the database,
storage, auth or email has **not** been executed end to end from the build environment, and no claim is
made that the schema, seed data or admin account were applied remotely.

Everything that can be checked offline **was** checked: typecheck, lint, the test suite, the production
build, the order API's validation/rate-limit/misconfiguration responses, the admin redirect gate, and the
bundled catalogue. Run `npm run verify` to repeat it, and `npm run verify:db` with your service-role key
to confirm the live project. `docs/DELIVERY_REPORT.md` keeps the two lists strictly separate.

## Demo catalogue

Eight categories, one product each, ₦ prices stored in kobo, two gallery views per product, and variants
where relevant (sizes, bead lengths). Re-running `npm run seed` never duplicates rows.

Ten of the sixteen gallery images are original generated views (every front, plus back views for the vase
and the T-shirt). The remaining six second images are honestly labelled detail crops of the front shot;
`docs/IMAGE_PIPELINE.md` explains how to replace them with real back-view photographs in the dashboard.

## Licence

Proprietary — Corazon Empire. Demo imagery generated for this project.
