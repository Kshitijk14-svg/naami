import { db } from "@/lib/db";
import { blogPosts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { redisDel } from "@/lib/redis";

export type BlogPost = typeof blogPosts.$inferSelect;

export async function getPublishedPosts(): Promise<BlogPost[]> {
  return getCached(CACHE_KEYS.BLOG_ALL, CACHE_TTL.BLOG, () =>
    db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt))
  );
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return getCached(CACHE_KEYS.BLOG_BY_SLUG(slug), CACHE_TTL.BLOG, async () => {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  });
}

export async function getAllPostsAdmin(): Promise<BlogPost[]> {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getPostById(id: number): Promise<BlogPost | null> {
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface CreatePostInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  isPublished?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const [post] = await db
    .insert(blogPosts)
    .values({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: input.content,
      coverImage: input.coverImage ?? null,
      isPublished: input.isPublished ?? false,
      publishedAt: input.isPublished ? new Date() : null,
    })
    .returning();
  await invalidateBlogCache(post.slug);
  return post;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: number;
}

export async function updatePost(input: UpdatePostInput): Promise<BlogPost | null> {
  const existing = await getPostById(input.id);
  if (!existing) return null;

  const [updated] = await db
    .update(blogPosts)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
      ...(input.isPublished !== undefined && {
        isPublished: input.isPublished,
        publishedAt:
          input.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
      }),
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, input.id))
    .returning();

  await invalidateBlogCache(existing.slug);
  if (updated && updated.slug !== existing.slug) {
    await invalidateBlogCache(updated.slug);
  }

  return updated ?? null;
}

export async function deletePost(id: number): Promise<void> {
  const existing = await getPostById(id);
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  if (existing) await invalidateBlogCache(existing.slug);
}

async function invalidateBlogCache(slug: string): Promise<void> {
  await Promise.allSettled([
    redisDel(CACHE_KEYS.BLOG_ALL),
    redisDel(CACHE_KEYS.BLOG_BY_SLUG(slug)),
  ]);
}
