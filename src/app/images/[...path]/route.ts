import { promises as fs } from "fs";
import path from "path";

/**
 * Fallback for runtime-uploaded images that live under public/images/ but
 * were written to disk *after* this build ran.
 *
 * This Next.js build only serves public/ files that existed at `next build`
 * time -- anything an admin uploads afterwards (src/app/api/admin/upload/route.ts
 * writes to this exact same public/images/{type}s/ directory) is invisible to
 * the framework's static-file layer and falls through to a 404. Next always
 * checks public/ static files first, so this catch-all route only ever
 * receives a request once that static lookup has already failed -- assets
 * that *were* present at build time keep being served by the normal fast
 * path, untouched by this handler.
 *
 * Restricted to a small image-extension whitelist and defends against path
 * traversal, since this does a manual filesystem read from URL segments
 * rather than Next's own (sandboxed) static-serving code.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
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

  const filePath = path.join(process.cwd(), "public", "images", ...segments);

  try {
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        // Every filename the upload pipeline produces is content-hash-suffixed
        // (uniqueFilename() in src/lib/imageProcessing.ts), so a given URL's
        // bytes never change once it exists -- safe to cache hard, unlike the
        // framework's own `Cache-Control: public, max-age=0` default for public/.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
