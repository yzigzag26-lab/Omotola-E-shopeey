# Deployment

The project targets Vercel and any Node 22 or Node 24 host that supports Next.js 16. `.nvmrc` and
`.node-version` pin the default runtime to Node 22 LTS, while `package.json` declares the supported
window explicitly: `engines.node` is `">=22.12.0 <25"`. 22.12 is the first release supported by
Vitest 5, Node 24 is what container build images ship (running `npm ci` there no longer logs
`EBADENGINE`), and the `<25` cap stops a future major from being adopted silently.

## 1. Prerequisites

- Supabase project with migrations applied (`docs/SETUP.md`)
- Seeded catalogue and provisioned administrator
- Resend domain verified, if email ordering is required

## 2. Environment variables (Production)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, no trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Publishable/anon key, public |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | Server-only; records email delivery status |
| `RESEND_API_KEY` | for email orders | Server-only |
| `ORDER_EMAIL_FROM` | for email orders | Verified sender |
| `ORDER_EMAIL_TO` | optional | Defaults to `omojuli001@gmail.com` |
| `DEMO_OFFLINE_FALLBACK` | no | Never enable in production |

## 3. Deploy

```bash
npm run build   # must pass locally first
```

**Vercel**

1. Import the GitHub repository.
2. Framework preset: Next.js. Build command `npm run build`, output handled automatically.
3. Add the environment variables above to Production (and Preview if desired).
4. Deploy.

**Other hosts**

```bash
npm ci
npm run build
npm start   # binds 0.0.0.0:3000; place behind TLS
```

## 4. Post-deploy configuration

1. Set Supabase **Site URL** to the production origin.
2. Add `https://<domain>/**` to **Redirect URLs** so password recovery returns to `/admin/reset-password`.
3. Update `NEXT_PUBLIC_SITE_URL` in the host if the domain changes.
4. Sign in at `/admin`, change the password, and confirm:
   - product edits appear on the storefront immediately
   - front/back image uploads succeed
   - the announcement marquee updates
   - a test WhatsApp order creates a pending order
   - a test email order arrives at the seller inbox (if configured)
5. Confirm `/admin` is not linked from public navigation and returns the login screen in incognito.
6. `robots.txt` disallows `/admin`, `/api/` and `/cart`; `/admin` also sends `noindex` headers.

## 5. Verifying a deployment

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... npm run verify:db
```

Then exercise the storefront: deep-link a product and category page, add multiple items, change
quantities, submit both channels, and confirm the cart survives a forced email failure.

## 6. Operational notes

- **Cache:** storefront pages are dynamic (cookie-aware Supabase client) and admin mutations call
  `revalidatePath`, so edits appear immediately without redeploys.
- **Rate limiting:** the app's limiter is in-memory per instance. Put Cloudflare/Vercel WAF rules in
  front of `/api/orders` and `/admin` for production-grade protection.
- **Backups:** enable Supabase point-in-time recovery before taking real orders.
- **Email deliverability:** configure SPF/DKIM/DMARC for the sender domain in Resend.
- **Rotation:** rotate the service-role key and Resend key if either is exposed; rotate after staff changes.
- **Monitoring:** watch Supabase Auth logs, the `/api/orders` route logs and Resend delivery events.

## 7. Rolling back

Application: redeploy the previous Vercel deployment. Database: migrations are additive; write a new
forward migration rather than editing applied files. Never drop `orders`/`order_items` — they hold the
seller's order history.
