import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB, matches the storage bucket limit
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const DISPLAY = { width: 1600, height: 2000 };
export const THUMB = { width: 640, height: 800 };
export const CANVAS = { r: 248, g: 244, b: 237, alpha: 1 };

export type ProcessedImage = {
  display: Buffer;
  thumb: Buffer;
  thumbContentType: "image/jpeg";
  width: number;
  height: number;
};

/**
 * Normalises an arbitrary upload into the catalogue's 4:5 display area without
 * distortion: EXIF orientation is applied, then the image is resized to *fit*
 * inside 1600×2000 and letterboxed on the brand ivory background.
 * The original proportions are preserved; nothing is cropped or stretched.
 */
export async function processProductImage(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    throw new Error("Unsupported file type. Please upload a JPEG, PNG or WebP image.");
  }
  if (file.size <= 0) throw new Error("The uploaded file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large. Please upload a file under 12 MB.");

  const input = Buffer.from(await file.arrayBuffer());

  let metadata: { width?: number; height?: number };
  try {
    metadata = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new Error("That file could not be read as an image.");
  }
  if (!metadata.width || !metadata.height) throw new Error("That file could not be read as an image.");
  if (metadata.width * metadata.height > 40_000_000) {
    throw new Error("Image dimensions are too large (over 40 megapixels).");
  }

  const display = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ ...DISPLAY, fit: "contain", background: CANVAS, withoutEnlargement: false })
    .flatten({ background: CANVAS })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  const thumb = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ ...THUMB, fit: "contain", background: CANVAS })
    .flatten({ background: CANVAS })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return { display, thumb, thumbContentType: "image/jpeg", width: DISPLAY.width, height: DISPLAY.height };
}
