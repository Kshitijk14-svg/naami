import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getPublishedPosts } from "@/db/queries/blog";
import EvanliteFooter from "@/components/EvanliteFooter";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || !post.isPublished) return { title: "Journal — NAAMI Atelier" };

  return {
    title: `${post.title} — NAAMI Journal`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      siteName: "NAAMI Atelier",
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export const revalidate = 300;

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || !post.isPublished) notFound();

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-20"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      {/* Hero image */}
      {post.coverImage && (
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "clamp(280px, 50vh, 520px)", backgroundColor: "#EDE8DC" }}
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            style={{ filter: "brightness(0.9)" }}
            priority
            sizes="100vw"
          />
          <div className="absolute top-0 left-0 bottom-0" style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.8 }} />
        </div>
      )}

      {/* Article body */}
      <article className="flex-1 w-full max-w-3xl mx-auto px-6 md:px-12 py-14">
        {/* Meta */}
        <div className="mb-8">
          <Link
            href="/journal"
            className="font-sans font-bold uppercase tracking-[0.2em] hover:opacity-50 transition-opacity"
            style={{ fontSize: "8px", color: "#8B1A1A" }}
          >
            ← Journal
          </Link>

          {post.publishedAt && (
            <p className="font-sans font-bold uppercase tracking-[0.2em] mt-4 mb-4" style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}>
              {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}

          <h1
            className="font-serif font-light uppercase"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "#111",
              letterSpacing: "0.03em",
              lineHeight: 1.08,
            }}
          >
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="font-serif font-light italic mt-5" style={{ fontSize: "1.1rem", color: "rgba(17,17,17,0.55)", lineHeight: 1.65 }}>
              {post.excerpt}
            </p>
          )}

          <div className="mt-8" style={{ height: "1px", background: "linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.1) 2px, transparent)" }} />
        </div>

        {/* Content */}
        <div
          className="prose-naami"
          style={{ fontSize: "15px", lineHeight: "1.85", color: "rgba(17,17,17,0.82)" }}
          dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br/>") }}
        />

        {/* Footer rule */}
        <div className="mt-16">
          <div style={{ height: "1px", background: "linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.08) 2px, transparent)" }} />
          <div className="flex justify-between items-center mt-6">
            <Link
              href="/journal"
              className="font-sans font-bold uppercase tracking-[0.2em] hover:opacity-50 transition-opacity"
              style={{ fontSize: "9px", color: "#111" }}
            >
              ← All Stories
            </Link>
            <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              NAAMI // ATELIER
            </span>
          </div>
        </div>
      </article>

      <EvanliteFooter />
    </main>
  );
}
