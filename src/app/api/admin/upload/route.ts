import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  MAX_UPLOAD_BYTES,
  InvalidImageError,
  validateImageBuffer,
  compressToWebpInRange,
  generateThumbnail,
  uniqueFilename,
} from "@/lib/imageProcessing";

const ALLOWED_TYPES = new Set(["product", "collection", "lookcard", "banner"]);

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const file = formData.get("file");
  const typeField = formData.get("type");
  const type = ALLOWED_TYPES.has(String(typeField)) ? String(typeField) : "product";

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "File exceeds the 15MB upload limit" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await validateImageBuffer(buffer);
  } catch (err) {
    if (err instanceof InvalidImageError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const [fullBuffer, thumbBuffer] = await Promise.all([
    compressToWebpInRange(buffer),
    generateThumbnail(buffer),
  ]);

  const baseName = uniqueFilename(
    path.basename(file.name, path.extname(file.name)) || "image"
  );
  const thumbName = baseName.replace(/\.webp$/, "-thumb.webp");

  const dir = path.join(process.cwd(), "public", "images", `${type}s`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, baseName), fullBuffer);
  await fs.writeFile(path.join(dir, thumbName), thumbBuffer);

  return Response.json({
    image: `/images/${type}s/${baseName}`,
    thumbnailImage: `/images/${type}s/${thumbName}`,
    sizeBytes: fullBuffer.byteLength,
    thumbnailSizeBytes: thumbBuffer.byteLength,
  });
}
