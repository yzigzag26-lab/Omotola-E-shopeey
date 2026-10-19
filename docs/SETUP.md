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

**Option C — one paste, no local tooling**

`supabase/setup.sql` is those four migrations plus the demo seed, the administrator grant and the
verification queries in a single file. Paste the whole thing into the SQL Editor and press Run.

```
https://raw.githubusercontent.com/yzigzag26-lab/Omotola-E-shopeey/main/supabase/setup.sql
```

(or open the file in the repository). It is generated, never hand-edited:

```bash
npm run setup:sql   # rebuilds supabase/setup.sql from the migrations and the seed
```

Two tests keep it honest: `tests/setup-sql.test.ts` fails if the committed file and its sources
disagree, and `tests/setup-sql-postgres.test.ts` applies it to a real PostgreSQL 17 with a
Supabase-shaped `auth`/`storage` schema, then asserts the resulting counts, privileges and
`is_admin()` behaviour. Both run in CI.

The file's **STEP 2** block writes the administrator allow-list row for
`omojuli001@gmail.com`. If that auth user does not exist yet, the block raises a notice and
leaves everything else applied; create the user in **Authentication → Users → Add user** and run
the STEP 2 block again. **STEP 3** is a read-only verification you can run at any time.

Verify (this is STEP 3 of `supabase/setup.sql`, so Option C already ran it):

```sql
select count(*) from public.products;       -- 8 after seeding
select count(*) from public.orders;         -- 0
select * from storage.buckets;              -- product-images, public = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';
select has_table_privilege('anon', 'public.orders', 'select');  -- false
```

Expected after seeding: 8 categories, 8 products, 16 image records, 13 variants, one enabled
announcement, one `store_settings` row, and (once provisioned) one `admin_users` row.

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

Or have a compliant password generated and printed once in your own terminal (never stored anywhere):

```bash
ADMIN_INITIAL_PASSWORD=--generate npm run provision-admin
```

The script enforces the policy before contacting Supabase: 12+ characters with an upper-case letter, a
lower-case letter, a digit and a symbol, no spaces, no character repeated four times, no keyboard or
alphabet runs, and not a commonly used password. It lists every unmet requirement and exits without
creating anything.

This creates a confirmed user with `app_metadata.role = "admin"` and inserts the `admin_users` allow-list
row. Both checks are used by `is_admin()`.

**Change the password immediately** via `/admin → Forgot password`, even if it was generated: an initial
password that has been typed into a shell or a chat is not secret.

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
npm run hooks:install   # one-time: block commits containing credentials
npm run doctor          # one-time: confirm your env vars and catalogue read correctly
npm run dev             # http://localhost:3000
```

`npm run doctor` makes **no network calls**. It checks the Node version, whether each variable is set and
correctly shaped, whether a service-role key has been placed in a `NEXT_PUBLIC_` variable (a hard
failure — it would be inlined into the browser bundle), key expiry, whether email ordering is enabled,
whether any `.env` file is tracked by git, and that the demo catalogue matches the 32 image files in
`public/products`. It prints lengths and JWT role claims, never secret values.

Useful checks:

```bash
npm run lint
npm run lint:secrets   # fail if a credential appears in a tracked file
npm run typecheck
npm test
npm run build
npm run verify         # all of the above, in order — also runs in CI
```

### Handling secrets

Credentials belong in exactly two places: your shell (for the one-time scripts) and your hosting
platform's environment variables. Never in a committed file.

- `.env` and `.env.*` are gitignored; only the `.env.example` template is tracked.
- `npm run lint:secrets` scans tracked files for service-role JWTs, Resend keys, AWS keys, GitHub tokens,
  private-key blocks and assigned credential literals. It reports file and line only, so running it
  cannot leak what it finds. The pre-commit hook runs it on staged files.
- If a key is ever committed or pasted into a chat or ticket, treat it as compromised: rotate it in the
  Supabase dashboard or Resend, and remove it from history. Rotating is the only real fix.

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| “Supabase is not configured” | Missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Ordering returns `503 STORE_NOT_CONFIGURED` | Same cause: the public Supabase variables are absent in the deployed environment. Distinct from a crash so a bad deploy is not mistaken for a code fault |
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
