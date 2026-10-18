#!/usr/bin/env node
/**
 * Normalises generated/uploaded product photography into the catalogue's 4:5
 * display ratio WITHOUT stretching: the image is rotated per EXIF, resized to
 * fit inside 1600x2000 and letterboxed on the brand background, then exported
 * as JPEG plus a 640x800 thumbnail.
 *
 * Usage: node scripts/process-images.mjs [--report-json]
 */
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "public", "products", "_raw");
const OUT_DIR = path.join(ROOT, "public", "products");
const BACKGROUND = { r: 248, g: 244, b: 237, alpha: 1 };

const DISPLAY = { width: 1600, height: 2000 };
const THUMB = { width: 640, height: 800 };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let files = [];
  try {
    files = (await readdir(RAW_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  } catch {
    console.error("No raw image directory found at public/products/_raw");
    process.exit(1);
  }

  const report = [];
  for (const file of files.sort()) {
    const base = path.parse(file).name;
    const source = path.join(RAW_DIR, file);
    const displayPath = path.join(OUT_DIR, `${base}.jpg`);
    const thumbPath = path.join(OUT_DIR, `${base}-thumb.jpg`);

    const input = sharp(source, { failOn: "none" }).rotate();
    const meta = await input.metadata();

    await input
      .clone()
      .resize({
        width: DISPLAY.width,
        height: DISPLAY.height,
        fit: "contain",
        background: BACKGROUND,
        withoutEnlargement: false,
      })
      .flatten({ background: BACKGROUND })
      .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(displayPath);

    await sharp(source, { failOn: "none" })
      .rotate()
      .resize({ width: THUMB.width, height: THUMB.height, fit: "contain", background: BACKGROUND })
      .flatten({ background: BACKGROUND })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(thumbPath);

    report.push({ base, sourceWidth: meta.width, sourceHeight: meta.height, displayPath });
    console.log(`✓ ${base} (${meta.width}x${meta.height}) -> 1600x2000 + 640x800`);
  }

  console.log(`\nProcessed ${files.length} source image(s).`);
  if (process.argv.includes("--report-json")) console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
