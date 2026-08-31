import { promises as fs } from "fs";
import path from "path";

/**
 * Fallback for runtime-uploaded videos that live under public/videos/ but were
 * written to disk *after* this build ran.
 *
 * Same story as src/app/images/[...path]/route.ts: this Next.js build only
 * serves public/ files that existed at `next build` time, so a clip an admin
 * uploads afterwards (src/app/api/admin/upload-video/route.ts writes it to
 * public/videos/moments/) is invisible to the framework's static-file layer and
 * 404s. Next always checks public/ static files first, so this catch-all route
 * only ever runs once that static lookup has already failed -- clips present at
 * build time keep being served by the normal fast path.
 *
 * Unlike the image route, this one implements HTTP Range requests: <video>
 * elements request `Range: bytes=0-` and Safari/iOS refuse to play a resource
 * that answers 200 instead of 206. Clips are capped at 60MB
 * (MAX_VIDEO_UPLOAD_BYTES) so reading the whole file per request and slicing is
 * acceptable -- no streaming needed.
 */

// Matches the extensions VideoUploadField accepts (video/mp4, video/webm,
// video/quicktime) and what upload-video/route.ts preserves from the original
// filename.
const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

/** Parse a single-range `Range: bytes=...` header against a known file size. */
function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;

  // Only single ranges are supported. A header we can't parse (multi-range,
  // other units, garbage) is ignored per RFC 7233 -- fall back to a full 200.
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;

  if (rawStart === "") {
    // Suffix range: `bytes=-500` => last 500 bytes.
    const suffix = Number(rawEnd);
    if (!rawEnd || suffix <= 0) return "unsatisfiable";
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  if (start > end || start >= size) return "unsatisfiable";
  return { start, end };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (segments.some((s) => s.includes("..") || s.includes("\0"))) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "videos", ...segments);

  let size: number;
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    size = stat.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    // Filenames are content-hash-suffixed (uniqueFilename() in
    // src/lib/imageProcessing.ts), so a URL's bytes never change once it exists.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = parseRange(request.headers.get("range"), size);

  if (range === "unsatisfiable") {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }

  const data = await fs.readFile(filePath);

  if (!range) {
    return new Response(new Uint8Array(data), {
      headers: { ...baseHeaders, "Content-Length": String(size) },
    });
  }

  const chunk = data.subarray(range.start, range.end + 1);
  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      ...baseHeaders,
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Content-Length": String(chunk.byteLength),
    },
  });
}
