# Setup guide

This guide takes a fresh Supabase project to a working Corazon Empire deployment.

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard> (Postgres 15+; this build targets 17).
2. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable (or anon) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service-role key → `SUPABASE_SERVICE_ROLE_KEY` (server/scripts only, never `NEXT_PUBLIC_`)

## 2. Apply the schema

Migrations live in `supabase/migrations/` and must be applied in filename order:

| Order | File | Contents |
| --- | --- | --- |
| 1 | `20261018000100_schema_tables.sql` | enums, tables, constraints, indexes, triggers |
| 2 | `20261018000200_order_functions.sql` | `submit_order()`, `set_order_email_status()` |
| 3 | `20261018000300_rls_storage_seed.sql` | RLS policies, storage bucket + policies, singleton rows |
| 4 | `20261018000400_grants.sql` | explicit table/function privileges per role |

**Option A — Supabase CLI (recommended)**

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

**Option B — SQL Editor**
Paste each file into the SQL Editor and run them in order. All files are idempotent (`if not exists`,
`drop policy if exists`), so re-running is safe.

Verify:

```sql
select count(*) from public.products;       -- 8 after seeding
select count(*) from public.orders;         -- 0
select * from storage.buckets;              -- product-images, public = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

## 3. Seed the demo catalogue

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

Expected result: 8 categories, 8 products, 16 image records, 13 variants. Re-running does not duplicate
anything. Prices are illustrative demo values, editable in the dashboard.

The seed references bundled images at `/products/*.jpg`, which ship with the repository, so the
storefront renders immediately. To serve images from Supabase Storage instead:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run upload-images
```

The bucket (`product-images`, 12 MB limit, JPEG/PNG/WebP, public read) is created by migration 3.

## 4. Configure authentication

**Authentication → URL configuration**

- Site URL: your production origin, e.g. `https://corazonempire.com` (use `http://localhost:3000` locally)
- Redirect URLs: add
  - `http://localhost:3000/**`
  - `https://your-production-domain/**`
  - `https://*.vercel.app/**` only if you use Vercel previews and accept the wider scope

The app exchanges recovery codes at `/auth/callback?next=/admin/reset-password`.

**Authentication → Providers → Email**

- Keep email provider enabled.
- Disable public signups (the dashboard is the only authenticated area). This repository's project has
  signups disabled; do the same for a new project.
- For reliable recovery mail, configure custom SMTP (Settings → Auth → SMTP). The default Supabase mailer
  is rate-limited and not intended for production deliverability.

**Password policy.** Supabase's minimum length is 6; the app's reset form enforces 8+ characters with a
letter and a number. Consider raising the project minimum and enabling leaked-password protection.

## 5. Provision the administrator

Preferred (never writes the password anywhere except Supabase, hashed):

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_EMAIL=omojuli001@gmail.com \
ADMIN_INITIAL_PASSWORD='choose-a-strong-unique-password' \
npm run provision-admin
```

This creates a confirmed user with `app_metadata.role = "admin"` and inserts the `admin_users` allow-list
row. Both checks are used by `is_admin()`.

The initial password requested for this project was set during provisioning. **Change it immediately**
via `/admin → Forgot password`. A short password such as the requested initial value is not suitable for
production.

## 6. Email ordering (optional)

Email ordering requires [Resend](https://resend.com) (or a compatible provider if you adapt
`src/lib/orders/submit.ts`).

1. Verify a sending domain in Resend and create an API key.
2. Set server-only variables:
   - `RESEND_API_KEY`
   - `ORDER_EMAIL_FROM` — a verified sender, e.g. `Corazon Empire <orders@yourdomain.com>`
   - `ORDER_EMAIL_TO` — defaults to `omojuli001@gmail.com`
3. Redeploy.

Without these variables, choosing “Email” returns a clear `EMAIL_NOT_CONFIGURED` message, creates no
order, and keeps the cart. WhatsApp ordering is unaffected.

Order notifications include reference, customer details, line items, subtotal, unconfirmed delivery fee
and total. Provider acceptance is recorded as `sent`; that means the provider accepted the request, not
that the message reached an inbox.

## 7. Admin recovery flow

1. `/admin` → **Forgot password**.
2. Enter `omojuli001@gmail.com` (only the designated administrator address can trigger mail).
3. The email link opens `/auth/callback` → `/admin/reset-password`.
4. Set a new password (8+ chars, letter + number). You are signed out and can sign in again.

If mail does not arrive: check SMTP settings, the Supabase Auth logs, spam, and the redirect allow-list.

## 8. Local development

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| “Supabase is not configured” | Missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Products page empty | Migration 3/4 not applied, or seed not run |
| Images show “Image coming soon” | Asset missing in `public/products` (run `scripts/process-images.mjs`) |
| Admin login: “Incorrect password” | Wrong password, unknown account, or user not confirmed — all intentionally identical |
| Admin login: “not an administrator” | User exists but has no `admin_users` row / `app_metadata.role` |
| Recovery email never arrives | SMTP not configured, rate limited, or redirect URL not allow-listed |
| Email ordering says unavailable | `RESEND_API_KEY` / `ORDER_EMAIL_FROM` missing |
| `permission denied for table …` | Migration 4 (grants) not applied |
| Upload says “new row violates … one_front” | Concurrent duplicate front image; refresh and retry |

## 10. What is intentionally absent

- Public promotions UI: campaigns can be managed in the dashboard but are never rendered publicly in
  this release, and the server refuses to save an enabled **and** public campaign.
- Stock quantities and automatic reservation: availability is confirmed manually by the seller.
- Payment processing: no card data is collected.
- Customer accounts/reviews/testimonials/sales statistics: none are fabricated or implemented.
