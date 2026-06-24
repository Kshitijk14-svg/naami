import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getPostById, updatePost, deletePost } from "@/db/queries/blog";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const post = await getPostById(Number(id));
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();

  const slug = body.slug?.trim() || (body.title ? slugify(body.title) : undefined);

  const updated = await updatePost({
    id: Number(id),
    ...(body.title !== undefined && { title: body.title.trim() }),
    ...(slug !== undefined && { slug }),
    ...(body.excerpt !== undefined && { excerpt: body.excerpt?.trim() }),
    ...(body.content !== undefined && { content: body.content.trim() }),
    ...(body.coverImage !== undefined && { coverImage: body.coverImage?.trim() }),
    ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
  });

  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await deletePost(Number(id));
  return new Response(null, { status: 204 });
}
