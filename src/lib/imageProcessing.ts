import sharp from "sharp";
import crypto from "crypto";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const FULL_IMAGE_MAX_EDGE = 1920;
export const FULL_IMAGE_MIN_BYTES = 300 * 1024;
export const FULL_IMAGE_MAX_BYTES = 600 * 1024;
export const FULL_IMAGE_MAX_ITERATIONS = 8;
export const FULL_IMAGE_QUALITY_FLOOR = 40;
export const FULL_IMAGE_QUALITY_CEIL = 100;

export const THUMBNAIL_WIDTH = 480;
export const THUMBNAIL_QUALITY = 60;

export class InvalidImageError extends Error {}

export async function validateImageBuffer(buffer: Buffer) {
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new InvalidImageError("File is not a valid image");
  }
  if (!metadata.width || !metadata.height) {
    throw new InvalidImageError("File is not a valid image");
  }
  return metadata;
}

interface CompressOptions {
  maxEdge?: number;
  minBytes?: number;
  maxBytes?: number;
  qualityFloor?: number;
  qualityCeil?: number;
  maxIterations?: number;
}

/**
 * Resizes and encodes to WebP, binary-searching the quality setting to land
 * the output within [minBytes, maxBytes]. Bounded iteration count since this
 * runs on a low-core VPS. Falls back to the closest result found if no
 * iteration lands in range.
 */
export async function compressToWebpInRange(
  buffer: Buffer,
  options: CompressOptions = {}
): Promise<Buffer> {
  const {
    maxEdge = FULL_IMAGE_MAX_EDGE,
    minBytes = FULL_IMAGE_MIN_BYTES,
    maxBytes = FULL_IMAGE_MAX_BYTES,
    qualityFloor = FULL_IMAGE_QUALITY_FLOOR,
    qualityCeil = FULL_IMAGE_QUALITY_CEIL,
    maxIterations = FULL_IMAGE_MAX_ITERATIONS,
  } = options;

  const resized = sharp(buffer).resize({
    width: maxEdge,
    height: maxEdge,
    fit: "inside",
    withoutEnlargement: true,
  });

  let quality = 80;
  let low = qualityFloor;
  let high = qualityCeil;
  let best: Buffer | null = null;
  let bestDistance = Infinity;

  for (let i = 0; i < maxIterations; i++) {
    const out = await resized.clone().webp({ quality }).toBuffer();
    const size = out.byteLength;

    if (size >= minBytes && size <= maxBytes) {
      return out;
    }

    const distance = size < minBytes ? minBytes - size : size - maxBytes;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = out;
    }

    if (size > maxBytes) {
      high = quality - 1;
      quality = Math.max(qualityFloor, Math.floor((low + quality) / 2));
    } else {
      low = quality + 1;
      quality = Math.min(qualityCeil, Math.ceil((quality + high) / 2));
    }

    if (low > high) break;
  }

  return best as Buffer;
}

export async function generateThumbnail(
  buffer: Buffer,
  { width = THUMBNAIL_WIDTH, quality = THUMBNAIL_QUALITY } = {}
): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

export function slugifyFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "image";
}

export function uniqueFilename(base: string, ext = "webp"): string {
  const slug = slugifyFilename(base);
  const hash = crypto.randomBytes(4).toString("hex");
  return `${slug}-${hash}.${ext}`;
}
