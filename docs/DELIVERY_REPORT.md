# Delivery report — Corazon Empire

_2026-10-18_

## Delivered

A complete Next.js 16 / TypeScript / Tailwind v4 / Supabase storefront and admin dashboard.

**Storefront:** home (hero, categories, featured, new arrivals, announcement marquee, about, contact),
shop with search / category / price + newest sorting / pagination / empty and error states, eight
category pages, product pages with a two-image gallery, variants, quantity, add-to-cart, WhatsApp order,
guest cart with persistent storage and delivery details, email ordering, about, contact, privacy, terms,
custom 404, error boundaries, loading states, sitemap, robots and JSON-LD.

**Admin (`/admin`, not linked publicly, `noindex`):** server-verified login, exact “Incorrect password”
message, no account enumeration, rate limiting, password recovery via email callback, overview, product
CRUD, image upload with 4:5 normalisation and replace / reorder / remove, categories, orders with status
and delivery fee, single announcement, promotions (inactive, no storefront UI), store settings.

**Database:** 4 ordered migrations — tables with FKs, constraints and indexes; `submit_order()` and
`set_order_email_status()` functions; RLS on every exposed table; storage bucket and policies; explicit
grants.

## Verified

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 problems |
| `npm run build` | success |
| `npm test` | 8 files, 33 tests passing |
| Live pages (dev server) | `/`, `/shop`, `/product/*`, `/category/*`, `/cart`, `/about`, `/contact`, `/privacy`, `/terms` → 200; unknown path → 404 |
| Admin gate | `/admin/products`, `/admin/orders` → 307 to `/admin` when anonymous |
| Order API | invalid payload → 422; email channel without provider → 503 `EMAIL_NOT_CONFIGURED`; unreachable DB → 502, no fake success |
| RLS: anonymous | 8 published products visible, draft hidden, `orders` unreadable and not writable |
| RLS: non-admin authenticated user | `is_admin() = false`, 0 orders, 0 draft products |
| RLS: administrator | `is_admin() = true`, all products incl. drafts, orders readable |
| Order transaction | created one order from two products at the DB-authoritative ₦42,000 subtotal; the same idempotency key returned the original order rather than duplicating |
| Demo seed in the live project | 8 categories, 8 products, 16 image rows, 13 variants |
| Administrator | `omojuli001@gmail.com` confirmed, `app_metadata.role = admin`, allow-list row present; public signups disabled |

The QA order and the draft test product used for these checks were deleted afterwards; the live project
holds no synthetic orders.

## Demo imagery

Ten original generated photographs: a front for each of the eight products, plus genuine back views for
the Aurelia vase and the Essential T-shirt. The other six products use an honestly labelled detail crop of
their front photograph as their second gallery image (`role = 'additional'`, alt text says "close detail").
Replacing them with real back views is done in **Admin → Products → Images → replace**; the uploader fits
any aspect ratio into 4:5 without cropping or stretching.

## Not verified from the build environment

The sandbox had outbound access to GitHub and npm only — no `*.supabase.co`. Everything touching the
database, storage and auth was therefore applied through the Supabase management connection, and the
following paths could not be executed end to end here:

- Storage uploads/deletes through the admin UI (bucket, policies and code paths exist).
- Supabase Auth email delivery and the browser recovery round-trip (SMTP is unconfigured on the project).
- Resend delivery (no API key was available); the unconfigured path is tested and honest.
- Browser-level UI testing of the cart and checkout interactions.
- `scripts/seed.mjs`, `upload-images.mjs`, `provision-admin.mjs`, `verify-db.mjs` — written and reviewed,
  but not executed in this sandbox; they require `SUPABASE_SERVICE_ROLE_KEY`.
- Any deployment: no hosting connector was available, so no public URL is claimed.

## Follow-ups before taking real orders

1. Change the administrator password via **Forgot password** (the initial password is weak by design request).
2. Configure custom SMTP in Supabase Auth and test recovery end-to-end.
3. Add `NEXT_PUBLIC_SITE_URL` for the production domain and allow-list its redirect URLs.
4. Add `RESEND_API_KEY` / `ORDER_EMAIL_FROM` to enable email ordering, then send a test order.
5. Replace the six detail crops with real back-view photographs.
6. Consider platform rate limiting in front of `/api/orders` and `/admin`.
