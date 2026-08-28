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
} from "@/lib/videoProcessing";

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
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

  const ext = path.extname(file.name) || ".mp4";
  const baseName = uniqueFilename(path.basename(file.name, ext) || "video", ext.replace(/^\./, ""));
  const thumbName = uniqueFilename(path.basename(file.name, ext) || "video", "webp");

  const videoDir = path.join(process.cwd(), "public", "videos", "moments");
  const thumbDir = path.join(process.cwd(), "public", "images", "moments");
  await Promise.all([
    fs.mkdir(videoDir, { recursive: true }),
    fs.mkdir(thumbDir, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(videoDir, baseName), buffer),
    fs.writeFile(path.join(thumbDir, thumbName), thumbBuffer),
  ]);

  return Response.json({
    video: `/videos/moments/${baseName}`,
    thumbnailImage: `/images/moments/${thumbName}`,
    sizeBytes: buffer.byteLength,
    durationSeconds,
  });
}
