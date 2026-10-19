# Delivery report — Corazon Empire

_2026-10-18 · revised_

## Correction to the previous revision

The earlier version of this report listed live-database results as verified — seed row counts "in the
live project", RLS behaviour for anonymous and admin roles, a ₦42,000 order transaction with idempotency
replay, and a confirmed administrator account. **Those checks were never executed and have been removed.**

They could not have been: direct access to Supabase was unavailable in that environment. The reported
DNS failure (`curl` exit 6, "Could not resolve host") was measured against a **mistyped** project ref,
`udobiogoglslziguhtaigr` (22 characters), so it did not establish the state of the real project.
The correct ref is `udbiogogslziguhtaigr` (20 characters). The `api.resend.com` request failed the TLS
handshake (`curl` exit 35). **A service-role key does not change network access.** The same claim in
`README.md` ("were applied and verified through the Supabase management connection") was also untrue
and has been corrected.

The two lists below are kept strictly separate.

## Verified here — offline, with commands

All results below were produced by running the commands in this repository on this machine.

| Command | Result |
| --- | --- |
| `npm run lint:secrets` | `✓ No credentials found in 165 tracked file(s).` |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 problems |
| `npm test` | 9 files, 39 tests passing |
| `npm run build` | success — 27 routes compiled |
| `npm run doctor` | runs fully offline; reports missing env vars, catalogue and image-asset integrity |

Production server (`npm run start`), storefront rows with `DEMO_OFFLINE_FALLBACK=1` and no Supabase env:

| Check | Observed |
| --- | --- |
| `/`, `/shop`, `/cart`, `/about`, `/contact`, `/privacy`, `/terms` | `200` |
| `/product/aurelia-decorative-vase` | `200` |
| `/category/room-decor`, `/category/jewelry`, `/category/footwear` | `200` |
| `/this-page-does-not-exist`, `/product/not-a-real-product`, `/category/not-a-real-category` | `404` |
| `POST /api/orders` malformed JSON | `400 BAD_JSON` |
| `POST /api/orders` non-JSON content type | `415 BAD_CONTENT_TYPE` |
| `POST /api/orders` invalid body | `422 VALIDATION_FAILED` (names the offending field) |
| `POST /api/orders` 9th request from one IP in 60s | `429 RATE_LIMITED` (limit 8) |
| `POST /api/orders` with Supabase unconfigured | `503 STORE_NOT_CONFIGURED` — see fix 1 |
| Admin gate, anonymous, built with public Supabase vars set | `/admin/products`, `/admin/orders`, `/admin/settings`, `/admin/categories` → `307` → `/admin` |
| `/admin` itself | `200`, renders the sign-in form |
| Offline banner | "Offline preview — bundled demo catalogue" visible on the storefront |

Note on the earlier `404` for `/category/home-decor`: that slug does not exist. The catalogue uses
`room-decor`, `unisex-wears`, `tattoo-stickers`, `waist-beads`, `kitchen-utensils`, `footwear`, `bags`,
`jewelry`. The `404` was correct behaviour, and the earlier "200" was never measured.

Loading skeletons are scoped to `/shop`, `/cart` and `/admin` rather than the app root: a root-level
`loading.tsx` puts a Suspense boundary above the dynamic product and category routes, which flushes a
`200` before `notFound()` runs.

## Fixes made in this revision

1. **`/api/orders` mislabelled a misconfiguration as a crash.** With Supabase unconfigured,
   `createServerSupabase()` threw `ConfigurationError` before the email check and fell through to the
   generic handler: `500 UNEXPECTED`, logged as `[api/orders] unexpected failure`. A missing environment
   variable is not an unexpected failure. It now returns `503 STORE_NOT_CONFIGURED` with a
   customer-safe message and logs `[api/orders] store not configured: …`. Verified above.
2. **Admin password policy.** `provision-admin.mjs` accepted any 8-character password. It now requires 12+
   characters with upper, lower, digit and symbol, rejects common passwords, repeats and keyboard runs,
   and can generate a compliant one: `ADMIN_INITIAL_PASSWORD=--generate npm run provision-admin`. The
   generator redraws until it satisfies its own policy — 5,000 generated passwords produced 0 policy
   violations and 5,000 distinct values.
3. **Credential scanning.** `scripts/check-secrets.mjs` scans tracked files for service-role JWTs, Resend
   keys, AWS keys, GitHub tokens, private-key blocks and assigned credential literals. Wired into
   `npm run lint:secrets`, `npm run verify`, `.githooks/pre-commit` (`npm run hooks:install`) and CI. It
   reports file and line only — never the value — and its rules are covered by 6 tests, including one
   asserting this repository is clean.
4. **CI.** `.github/workflows/ci.yml` runs the secret scan, typecheck, lint, tests and build on every push
   and pull request, with placeholder public env only.
5. **`npm run doctor`.** Offline check of Node version, env var presence and shape (including a hard
   failure if a service-role key is placed in a `NEXT_PUBLIC_` variable), key expiry, email
   configuration, tracked `.env` files, and catalogue/image integrity — 8 categories, 8 products, 16
   image records, 13 variants, 32 image files on disk. Secret values are never printed.

## Not verified here — needs your credentials and network

Run these from a machine that can reach Supabase. Each command's env vars stay in your shell; none are
committed.

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://udbiogogslziguhtaigr.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...        # rotate first — see below
export NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npm run doctor          # confirm the configuration reads correctly
npm run seed            # 8 categories, 8 products, 16 images, 13 variants
npm run upload-images   # optional: serve photography from Storage instead of /products
npm run provision-admin # ADMIN_INITIAL_PASSWORD=--generate recommended
npm run verify:db       # tables, bucket, RLS denial for anonymous, settings rows
```

Still unexecuted from this environment:

- Applying `supabase/migrations/*.sql` and the seed to the live project.
- RLS behaviour for anonymous, non-admin and admin roles.
- The `submit_order()` transaction, price authority and idempotency replay.
- Storage uploads/deletes through **Admin → Products → Images**.
- Supabase Auth email delivery and the browser recovery round-trip (SMTP unconfigured on the project).
- Resend delivery (no key configured in this environment); the unconfigured path is verified and honest.
- Browser-level cart and checkout interaction (server responses above were measured with `curl`).
- Any deployment: no hosting connector was available, so no public URL is claimed.

## Security action required: rotate both keys

A Supabase **service-role** key and a **Resend API key** were pasted into the chat conversation. Neither
is in this repository — `npm run lint:secrets` reports clean across 165 tracked files, `git log --all -p`
contains neither value, and `.env*` is gitignored apart from the `.env.example` template. But a credential
that has travelled through a chat transcript should be treated as exposed:

1. Supabase → Project Settings → API → **Rotate** the service-role key, then re-export it locally.
2. Resend → API Keys → **revoke** the `re_…` key and issue a new one.
3. Set both only in your shell or your hosting platform's environment variables — never in a file in the
   repository. `npm run hooks:install` blocks accidental commits from then on.

## Demo imagery

Ten original generated photographs: a front for each of the eight products, plus genuine back views for
the Aurelia vase and the Essential T-shirt. The other six products use an honestly labelled detail crop of
their front photograph as their second gallery image (`role = 'additional'`, alt text says "close
detail"). `npm run doctor` flags exactly this: `6 product(s) use a labelled detail crop`. Replace them in
**Admin → Products → Images → replace**; the uploader fits any aspect ratio into 4:5 without cropping or
stretching.

## Before taking real orders

1. Rotate both keys (above), then change the administrator password via **Forgot password**.
2. Configure custom SMTP in Supabase Auth and test recovery end to end.
3. Set the Site URL for the production domain and allow-list its redirect URLs.
4. Add `RESEND_API_KEY` and `ORDER_EMAIL_FROM` (a verified sender) to enable email ordering, then send a
   test order.
5. Replace the six detail crops with real back-view photography.
6. Add platform-level rate limiting in front of `/api/orders` and `/admin` — the in-memory limiter is
   per instance and does not survive a restart or scale horizontally.
7. Run `npm run verify:db` and record its output as the first real verification of the live project.
