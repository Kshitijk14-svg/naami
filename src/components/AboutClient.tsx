"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import EvanliteFooter from "@/components/EvanliteFooter";
import { PRODUCT_NAME_CLASS, TITLE_CLASS, TITLE_ACCENT_CLASS, TITLE_ACCENT_STYLE, titleStyle } from "@/lib/typography";
import type { AboutMilestone, AboutPillar, AboutTeamMember } from "@/lib/pageContentDefaults";

gsap.registerPlugin(ScrollTrigger);

export interface AboutContent {
  heroKicker: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroSubline: string;
  storyImage: string;
  foundingEyebrow: string;
  foundingBody: string;
  methodKicker: string;
  methodTitle: string;
  methodTitleAccent: string;
  pillars: AboutPillar[];
  archiveKicker: string;
  timeline: AboutMilestone[];
  teamKicker: string;
  team: AboutTeamMember[];
  closingQuote: string;
  closingAttribution: string;
  closingCtaLabel: string;
}

export default function AboutClient({ content }: { content: AboutContent }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const foundingParagraphs = content.foundingBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reveals = gsap.utils.toArray<HTMLElement>(".about-reveal");
      reveals.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
      });

      const pillarsEls = gsap.utils.toArray<HTMLElement>(".pillar-card");
      pillarsEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            delay: i * 0.1,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          }
        );
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={mainRef} className="w-full min-h-screen flex flex-col" style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}>

      {/* Hero */}
      <section className="pt-36 pb-16 px-8 md:px-12 about-reveal" style={{ opacity: 0 }}>
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block" style={{ fontSize: "9px", color: "#5B1C1C" }}>
          {content.heroKicker}
        </span>
        <h1 className={TITLE_CLASS} style={titleStyle("clamp(2.5rem, 5vw, 4rem)")}>
          {content.heroTitle}
          <br />
          <span className={TITLE_ACCENT_CLASS} style={TITLE_ACCENT_STYLE}>{content.heroTitleAccent}</span>
        </h1>
        <p className="font-sans mt-6 max-w-lg" style={{ fontSize: "13px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
          {content.heroSubline}
        </p>
      </section>

      {/* Divider */}
      <div className="mx-8 md:mx-12" style={{ height: "1px", backgroundColor: "rgba(17,17,17,0.06)" }} />

      {/* Brand story split */}
      <section className="px-8 md:px-12 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-start about-reveal" style={{ opacity: 0 }}>
        <div className="md:col-span-5 relative border border-black/5 bg-[#F8F1E5]" style={{ aspectRatio: "4/5", minHeight: "320px" }}>
          <div className="absolute top-0 left-0 bottom-0" style={{ width: "3.5px", backgroundColor: "#5B1C1C", opacity: 0.8, zIndex: 1 }} />
          <Image src={content.storyImage} alt="NAAMI Atelier" fill className="object-cover" style={{ filter: "brightness(0.93)" }} sizes="(max-width: 768px) 100vw, 45vw" />
        </div>

        <div className="md:col-span-6 md:col-start-7 flex flex-col justify-center">
          <span className="font-sans font-bold uppercase tracking-[0.25em] mb-6 block" style={{ fontSize: "9px", color: "#5B1C1C" }}>
            {content.foundingEyebrow}
          </span>
          {foundingParagraphs.map((para, i) => (
            <p
              key={i}
              className={`font-sans ${i < foundingParagraphs.length - 1 ? "mb-5" : ""}`}
              style={{ fontSize: "13px", color: "rgba(17,17,17,0.75)", lineHeight: 1.75 }}
            >
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="px-8 md:px-12 py-16" style={{ backgroundColor: "#F8F1E5" }}>
        <div className="mb-12 about-reveal" style={{ opacity: 0 }}>
          <span className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block" style={{ fontSize: "9px", color: "#5B1C1C" }}>
            {content.methodKicker}
          </span>
          <h2 className={TITLE_CLASS} style={titleStyle("clamp(2rem, 4vw, 3rem)")}>
            {content.methodTitle}
            <br />
            <span className={TITLE_ACCENT_CLASS} style={TITLE_ACCENT_STYLE}>{content.methodTitleAccent}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.pillars.map((p, i) => (
            <div key={`${p.number}-${i}`} className="pillar-card flex flex-col" style={{ opacity: 0 }}>
              <div
                className="font-sans font-bold mb-5"
                style={{ fontSize: "8px", color: "#5B1C1C", letterSpacing: "0.3em", borderLeft: "3px solid #5B1C1C", paddingLeft: "10px" }}
              >
                {`${p.number} // ${p.title.toUpperCase()}`}
              </div>
              <h3
                className={`${PRODUCT_NAME_CLASS} mb-4`}
                style={{ fontSize: "1.4rem", color: "#5B1C1C", letterSpacing: "0.03em" }}
              >
                {p.title}
              </h3>
              <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.6)", lineHeight: 1.7 }}>
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="px-8 md:px-12 py-20 about-reveal" style={{ opacity: 0 }}>
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-10 block" style={{ fontSize: "9px", color: "#5B1C1C" }}>
          {content.archiveKicker}
        </span>
        <div className="flex flex-col gap-0">
          {content.timeline.map((t, i) => (
            <div
              key={`${t.year}-${i}`}
              className="flex gap-8 md:gap-16 py-8"
              style={{ borderTop: i === 0 ? "1px solid rgba(17,17,17,0.06)" : "none", borderBottom: "1px solid rgba(17,17,17,0.06)" }}
            >
              <div className="w-16 md:w-24 shrink-0">
                <span className="font-serif font-light" style={{ fontSize: "1.6rem", color: "#5B1C1C", letterSpacing: "0.02em" }}>
                  {t.year}
                </span>
              </div>
              <div>
                <h4 className={`${PRODUCT_NAME_CLASS} mb-2`} style={{ fontSize: "1.05rem", color: "#1A1212", letterSpacing: "0.03em" }}>
                  {t.event}
                </h4>
                <p className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)", lineHeight: 1.6 }}>
                  {t.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="px-8 md:px-12 py-16 about-reveal" style={{ backgroundColor: "#F8F1E5", opacity: 0 }}>
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-10 block" style={{ fontSize: "9px", color: "#5B1C1C" }}>
          {content.teamKicker}
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.team.map((member, i) => (
            <div key={`${member.name}-${i}`} className="flex flex-col">
              <div
                className="w-full bg-[#FFF9EF] border border-black/5 mb-5 flex items-center justify-center"
                style={{ aspectRatio: "1/1" }}
              >
                <div className="font-serif text-4xl font-light" style={{ color: "rgba(139,26,26,0.15)" }}>
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
              </div>
              <h4 className={`${PRODUCT_NAME_CLASS} mb-1`} style={{ fontSize: "1rem", color: "#1A1212", letterSpacing: "0.03em" }}>
                {member.name}
              </h4>
              <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)", letterSpacing: "0.1em" }}>
                {member.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing manifesto */}
      <section className="px-8 md:px-12 py-20 text-center about-reveal" style={{ opacity: 0 }}>
        <p
          className="font-serif font-light mx-auto"
          style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", color: "rgba(17,17,17,0.85)", lineHeight: 1.55, maxWidth: "640px" }}
        >
          &ldquo;{content.closingQuote}&rdquo;
        </p>
        <div className="mt-6 font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "rgba(17,17,17,0.35)" }}>
          {content.closingAttribution}
        </div>
        <div className="mt-12">
          <Link
            href="/collection"
            className="inline-block font-sans font-bold uppercase tracking-[0.25em] py-4 px-10 transition-opacity hover:opacity-80"
            style={{ fontSize: "10px", backgroundColor: "#5B1C1C", color: "#FFF9EF" }}
          >
            {content.closingCtaLabel}
          </Link>
        </div>
      </section>

      <EvanliteFooter />
    </main>
  );
}
