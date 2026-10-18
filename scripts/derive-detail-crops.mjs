#!/usr/bin/env node
/**
 * Derives a second gallery image ("detail" crop) for products whose true
 * back-view photograph is not available yet.
 *
 * These are honest crops of the existing front photograph — not fabricated
 * angles. They keep every demo product's gallery to two images and are meant
 * to be replaced by real back views via Admin → Products → Images.
 *
 *   node scripts/derive-detail-crops.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_DIR = path.join(ROOT, "public/products/_raw");
const OUT_DIR = path.join(ROOT, "public/products");

const BACKGROUND = "#f8f4ed";
const ZOOM = 0.7;

const SLUGS = [
  "minimalist-tattoo-sticker-set",
  "signature-waist-bead-set",
  "modern-kitchen-utensil-set",
  "everyday-comfort-slides",
  "everyday-luxe-shoulder-bag",
  "classic-gold-tone-jewelry-set",
];

await mkdir(OUT_DIR, { recursive: true });

for (const slug of SLUGS) {
  const source = path.join(RAW_DIR, `${slug}-front.png`);
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height) throw new Error(`${slug}: unreadable source`);

  const width = Math.round(meta.width * ZOOM);
  const height = Math.round(meta.height * ZOOM);
  const left = Math.round((meta.width - width) / 2);
  const top = Math.round((meta.height - height) / 2);
  const crop = sharp(source).extract({ left, top, width, height });

  const full = await crop
    .clone()
    .resize({ width: 1600, height: 2000, fit: "contain", background: BACKGROUND, kernel: "lanczos3" })
    .sharpen({ sigma: 1.1 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const thumb = await crop
    .clone()
    .resize({ width: 640, height: 800, fit: "contain", background: BACKGROUND, kernel: "lanczos3" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  await writeFile(path.join(OUT_DIR, `${slug}-detail.jpg`), full);
  await writeFile(path.join(OUT_DIR, `${slug}-detail-thumb.jpg`), thumb);
  console.log(`detail crop → ${slug}-detail.jpg (+ thumb)`);
}

console.log("Done. Replace these with real back-view photographs when available.");
