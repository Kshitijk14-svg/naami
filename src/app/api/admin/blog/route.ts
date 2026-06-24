import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getAllPostsAdmin, createPost } from "@/db/queries/blog";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  return Response.json(await getAllPostsAdmin());
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.title?.trim() || !body.content?.trim()) {
    return Response.json({ error: "title and content are required" }, { status: 400 });
  }

  const slug = body.slug?.trim() || slugify(body.title);

  const post = await createPost({
    title: body.title.trim(),
    slug,
    excerpt: body.excerpt?.trim() || undefined,
    content: body.content.trim(),
    coverImage: body.coverImage?.trim() || undefined,
    isPublished: body.isPublished ?? false,
  });

  return Response.json(post, { status: 201 });
}
