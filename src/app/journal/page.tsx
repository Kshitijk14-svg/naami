import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Fragment } from "react";
import { getPublishedPosts } from "@/db/queries/blog";
import { getAllDesignSettings } from "@/db/queries/designSettings";
import EvanliteFooter from "@/components/EvanliteFooter";
import { PRODUCT_NAME_CLASS, TITLE_CLASS, titleStyle } from "@/lib/typography";

/** Render a setting string with "\n" turned into <br/> line breaks. */
function withLineBreaks(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

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
  const [posts, settings] = await Promise.all([getPublishedPosts(), getAllDesignSettings()]);

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {/* Header */}
      <section className="px-6 md:px-12 py-16">
        <p className="font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ fontSize: "9px", color: "#5B1C1C" }}>
          {settings.journal_kicker}
        </p>
        <h1 className={TITLE_CLASS} style={titleStyle("clamp(2.5rem, 5vw, 4.5rem)")}>
          {withLineBreaks(settings.journal_title)}
        </h1>

        {/* Selvedge rule */}
        <div
          className="mt-8"
          style={{ height: "1px", background: "linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)" }}
        />
      </section>

      {/* Posts grid */}
      <section className="flex-1 px-6 md:px-12 pb-20">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-[3px] h-12 bg-[#5B1C1C] opacity-50 mx-auto mb-8" />
            <p className="font-serif font-light" style={{ fontSize: "1.3rem", color: "rgba(17,17,17,0.4)" }}>
              {settings.journal_empty_state}
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
                  style={{ aspectRatio: "4/3", backgroundColor: "#F8F1E5" }}
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
                      style={{ backgroundColor: "#F8F1E5" }}
                    >
                      <span className="font-serif font-light opacity-30" style={{ fontSize: "1.2rem" }}>
                        NAAMI
                      </span>
                    </div>
                  )}
                  {/* Selvedge line */}
                  <div className="absolute top-0 left-0 bottom-0" style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.75 }} />
                </div>

                {/* Post meta */}
                {post.publishedAt && (
                  <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#5B1C1C" }}>
                    {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}

                <h2
                  className={`${PRODUCT_NAME_CLASS} mb-3`}
                  style={{ fontSize: "1.15rem", color: "#5B1C1C", letterSpacing: "0.03em", lineHeight: 1.25 }}
                >
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
                    {post.excerpt.length > 120 ? `${post.excerpt.slice(0, 120)}…` : post.excerpt}
                  </p>
                )}

                <span
                  className="inline-block font-sans font-bold uppercase tracking-[0.2em] mt-4 group-hover:text-[#5B1C1C] transition-colors"
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
