# Image pipeline

## Display contract

Every product image — on cards, product galleries, thumbnails, cart lines and admin previews — is
rendered inside `src/components/ui/product-image.tsx`:

- fixed **4:5** aspect ratio container with `position: relative`
- `object-fit: contain`, centred
- consistent ivory background (`--color-ivory-deep`)
- loading and error states, plus an honest “Image coming soon” fallback
- meaningful alt text supplied per image record

No category gets custom sizing. Source aspect ratios never distort card alignment.

## Upload normalisation

`src/lib/images/process.ts` (server-only, `sharp`):

1. Reject non-JPEG/PNG/WebP, empty files, files over **12 MB**, and images over **40 MP**.
2. Apply EXIF orientation (`.rotate()`).
3. Resize to **fit** inside 1600×2000 — `fit: "contain"`, letterboxed on `#f8f4ed`. Nothing is cropped or
   stretched; the source proportions are preserved.
4. Export JPEG (mozjpeg, quality 86) plus a 640×800 thumbnail (quality 80).

`src/lib/images/upload.ts` stores both objects in the public `product-images` bucket under
`<productId>/<uuid>.jpg` and `<productId>/<uuid>-thumb.jpg`, then writes `storage_path`, `image_url`,
`image_url_thumb`, role, alt text, dimensions and display order to `product_images`.

- **front/back** are unique per product (partial unique indexes). Replacing one updates the existing row,
  so the old object is removed only after the new URL is committed.
- **additional** images append with the next display order and can be reordered or removed.
- Storage deletion checks that no other row references the path first.

## Admin uploads

The product form accepts a front image, a back image and up to four additional images per save, with
client-side previews before saving. Admins can later remove or reorder images independently; every change
is a server action guarded by `is_admin()` and storage RLS.

## Demo assets

`public/products/_raw/*.png` are the generated studio shots. `scripts/process-images.mjs` produces the
normalised `public/products/*.jpg` (+ `-thumb.jpg`) used by the seeded catalogue. The raw directory is
git-ignored; processed assets are committed so the site renders without an external service.

Ten of the sixteen catalogue images are original generated views: a front for all eight products and true
back views for the vase and the T-shirt. For the other six products a real back-view photograph was not
available when this build was produced, so their second gallery image is an **honestly labelled detail
crop** of the front photograph (`scripts/derive-detail-crops.mjs`), stored as
`<slug>-detail.jpg` / `<slug>-detail-thumb.jpg` with `role = 'additional'` and alt text describing a close
detail. No image is presented as a view it is not.

Replacing a detail crop with a real back view is a two-minute task in the dashboard: **Admin → Products →
(product) → Images → replace**, and the uploader re-fits whatever aspect ratio you supply into 4:5
without cropping or stretching.

`npm run upload-images` optionally copies the processed assets into Supabase Storage and repoints the demo
records there — useful once the storage bucket is confirmed reachable from your environment.

Editing the catalogue? Change `supabase/seed/demo-catalog.json`, then run `npm run seed:sql` to regenerate
`demo-catalog.sql` and `seed-apply.sql` so the three never drift apart.
