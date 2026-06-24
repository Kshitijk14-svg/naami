import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/db/queries/blog";
import EvanliteFooter from "@/components/EvanliteFooter";

export const metadata: Metadata = {
  title: "Journal — NAAMI Atelier",
  description: "Stories, craft notes, and inspiration from the NAAMI workshop.",
  openGraph: {
    title: "Journal — NAAMI Atelier",
    description: "Stories, craft notes, and inspiration from the NAAMI workshop.",
    siteName: "NAAMI Atelier",
  },
};

export const revalidate = 300;

export default async function JournalPage() {
  const posts = await getPublishedPosts();

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-20"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      {/* Header */}
      <section className="px-6 md:px-12 py-16">
        <p className="font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // THE JOURNAL
        </p>
        <h1
          className="font-serif font-light uppercase"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
            color: "#111",
            letterSpacing: "0.03em",
            lineHeight: 1.05,
          }}
        >
          Stories from<br />the Atelier
        </h1>

        {/* Selvedge rule */}
        <div
          className="mt-8"
          style={{ height: "1px", background: "linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.1) 2px, transparent)" }}
        />
      </section>

      {/* Posts grid */}
      <section className="flex-1 px-6 md:px-12 pb-20">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-[3px] h-12 bg-[#8B1A1A] opacity-50 mx-auto mb-8" />
            <p className="font-serif font-light italic" style={{ fontSize: "1.3rem", color: "rgba(17,17,17,0.4)" }}>
              New stories coming soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/journal/${post.slug}`}
                className="group block"
                data-cursor-text="READ"
              >
                {/* Cover image */}
                <div
                  className="relative w-full overflow-hidden mb-5"
                  style={{ aspectRatio: "4/3", backgroundColor: "#EDE8DC" }}
                >
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "#EDE8DC" }}
                    >
                      <span className="font-serif font-light italic opacity-30" style={{ fontSize: "1.2rem" }}>
                        NAAMI
                      </span>
                    </div>
                  )}
                  {/* Selvedge line */}
                  <div className="absolute top-0 left-0 bottom-0" style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.75 }} />
                </div>

                {/* Post meta */}
                {post.publishedAt && (
                  <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#8B1A1A" }}>
                    {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}

                <h2
                  className="font-serif font-light uppercase group-hover:text-[#8B1A1A] transition-colors mb-3"
                  style={{ fontSize: "1.15rem", color: "#111", letterSpacing: "0.03em", lineHeight: 1.25 }}
                >
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
                    {post.excerpt.length > 120 ? `${post.excerpt.slice(0, 120)}…` : post.excerpt}
                  </p>
                )}

                <span
                  className="inline-block font-sans font-bold uppercase tracking-[0.2em] mt-4 group-hover:text-[#8B1A1A] transition-colors"
                  style={{
                    fontSize: "8.5px",
                    color: "#111",
                    borderBottom: "1px solid currentColor",
                    paddingBottom: "2px",
                  }}
                >
                  Read →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <EvanliteFooter />
    </main>
  );
}
