import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { uniqueFilename } from "@/lib/imageProcessing";
import {
  MAX_VIDEO_UPLOAD_BYTES,
  InvalidVideoError,
  validateVideoBuffer,
  generateVideoThumbnail,
  compressVideo,
} from "@/lib/videoProcessing";

// Which feature is uploading -> which public/ subdir the files land in.
// "products" clips are re-encoded to a web-friendly MP4 before storage;
// "moments" (Shared Moments) keep today's store-the-original behaviour.
const UPLOAD_TYPES = ["moments", "products"] as const;
type UploadType = (typeof UPLOAD_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const rawType = formData.get("type");
  const type: UploadType =
    typeof rawType === "string" && (UPLOAD_TYPES as readonly string[]).includes(rawType)
      ? (rawType as UploadType)
      : "moments";
  if (rawType != null && rawType !== type) {
    return Response.json({ error: "Invalid upload type" }, { status: 400 });
  }

  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return Response.json(
      { error: `File exceeds the ${Math.floor(MAX_VIDEO_UPLOAD_BYTES / (1024 * 1024))}MB upload limit` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let durationSeconds: number;
  try {
    ({ durationSeconds } = await validateVideoBuffer(buffer));
  } catch (err) {
    if (err instanceof InvalidVideoError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let thumbBuffer: Buffer;
  try {
    thumbBuffer = await generateVideoThumbnail(buffer, durationSeconds);
  } catch (err) {
    if (err instanceof InvalidVideoError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Product clips are re-encoded (H.264/AAC, <=1080p, +faststart) so the
  // storefront's floating player streams progressively; the output is always
  // an .mp4 regardless of the source container.
  let videoBuffer: Buffer = buffer;
  let ext = path.extname(file.name) || ".mp4";
  if (type === "products") {
    try {
      videoBuffer = await compressVideo(buffer);
      ext = ".mp4";
    } catch (err) {
      if (err instanceof InvalidVideoError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const stem = path.basename(file.name, path.extname(file.name)) || "video";
  const baseName = uniqueFilename(stem, ext.replace(/^\./, ""));
  const thumbName = uniqueFilename(stem, "webp");

  const videoDir = path.join(process.cwd(), "public", "videos", type);
  const thumbDir = path.join(process.cwd(), "public", "images", type);
  await Promise.all([
    fs.mkdir(videoDir, { recursive: true }),
    fs.mkdir(thumbDir, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(videoDir, baseName), videoBuffer),
    fs.writeFile(path.join(thumbDir, thumbName), thumbBuffer),
  ]);

  return Response.json({
    video: `/videos/${type}/${baseName}`,
    thumbnailImage: `/images/${type}/${thumbName}`,
    sizeBytes: videoBuffer.byteLength,
    durationSeconds,
  });
}
