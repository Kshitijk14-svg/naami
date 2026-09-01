import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getPublishedPosts } from "@/db/queries/blog";
import { getAllDesignSettings } from "@/db/queries/designSettings";
import EvanliteFooter from "@/components/EvanliteFooter";
import { TITLE_CLASS, titleStyle } from "@/lib/typography";

/**
 * Post bodies are authored as plain text - the only markup this view ever wanted
 * was the newline-to-<br/> treatment below. Interpolating the raw body into
 * dangerouslySetInnerHTML made every published post a stored-XSS vector for
 * anyone with journal-authoring access. Escape first, then add the breaks, so
 * the <br/> tags are the only HTML that can reach the DOM.
 */
function toParagraphHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\r?\n/g, "<br/>");
}

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
  const [post, settings] = await Promise.all([getPostBySlug(slug), getAllDesignSettings()]);

  if (!post || !post.isPublished) notFound();

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {/* Hero image */}
      {post.coverImage && (
        <div
          className="relative w-full overflow-hidden"
          style={{ height: "clamp(280px, 50vh, 520px)", backgroundColor: "#F8F1E5" }}
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
          <div className="absolute top-0 left-0 bottom-0" style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.8 }} />
        </div>
      )}

      {/* Article body */}
      <article className="flex-1 w-full max-w-3xl mx-auto px-6 md:px-12 py-14">
        {/* Meta */}
        <div className="mb-8">
          <Link
            href="/journal"
            className="font-sans font-bold uppercase tracking-[0.2em] hover:opacity-50 transition-opacity"
            style={{ fontSize: "8px", color: "#5B1C1C" }}
          >
            ← Journal
          </Link>

          {post.publishedAt && (
            <p className="font-sans font-bold uppercase tracking-[0.2em] mt-4 mb-4" style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}>
              {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}

          <h1 className={TITLE_CLASS} style={titleStyle("clamp(2rem, 5vw, 3.5rem)")}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="font-serif font-light mt-5" style={{ fontSize: "1.1rem", color: "rgba(17,17,17,0.55)", lineHeight: 1.65 }}>
              {post.excerpt}
            </p>
          )}

          <div className="mt-8" style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)" }} />
        </div>

        {/* Content */}
        <div
          className="prose-naami"
          style={{ fontSize: "15px", lineHeight: "1.85", color: "rgba(17,17,17,0.82)" }}
          dangerouslySetInnerHTML={{ __html: toParagraphHtml(post.content) }}
        />

        {/* Footer rule */}
        <div className="mt-16">
          <div style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.08) 2px, transparent)" }} />
          <div className="flex justify-between items-center mt-6">
            <Link
              href="/journal"
              className="font-sans font-bold uppercase tracking-[0.2em] hover:opacity-50 transition-opacity"
              style={{ fontSize: "9px", color: "#111" }}
            >
              ← All Stories
            </Link>
            <span className="font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#5B1C1C" }}>
              {settings.journal_post_footer_label}
            </span>
          </div>
        </div>
      </article>

      <EvanliteFooter />
    </main>
  );
}
