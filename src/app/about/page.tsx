"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import EvanliteFooter from "@/components/EvanliteFooter";
import { useCartStore } from "@/models/cartStore";

gsap.registerPlugin(ScrollTrigger);

const pillars = [
  {
    number: "01",
    title: "The Cloth",
    description:
      "Every shirt begins with a fabric sourced from heritage mills in Italy, Japan, and India. We insist on long-staple cotton, European linen, and handspun khadi — materials that improve with age and resist the shortcuts of modern fast fashion.",
  },
  {
    number: "02",
    title: "The Cut",
    description:
      "Each pattern is developed in-house and hand-cut from a single cloth length, grain-aligned by a single artisan. A shirt that hangs correctly is the result of pattern-making skill, not software shortcuts. We do this the slow way.",
  },
  {
    number: "03",
    title: "The Finish",
    description:
      "Mother-of-pearl buttons are attached by hand. Collars are pressed with a curved iron. Plackets are steamed flat. These final touches take longer than the construction itself — and they are what you feel when you put the shirt on.",
  },
];

const timeline = [
  { year: "2019", event: "Founded in Lisbon, Portugal", detail: "NAAMI began as an atelier focused on single-origin shirting for the European market." },
  { year: "2021", event: "First Japanese Sourcing Partnership", detail: "Partnerships with Albini Group and Nishimoto Mills opened access to heritage shuttle-loom fabrics." },
  { year: "2023", event: "India Studio Opens", detail: "A second atelier established in Jaipur to work with artisans specialising in handspun khadi and natural-dye techniques." },
  { year: "2026", event: "AW26 Collection Launch", detail: "Fourteen styles across Oxford, Linen, Chambray, and Sashiko lines — available now." },
];

const team = [
  { name: "Arjun Mehta", title: "Founder & Creative Director" },
  { name: "Clara Fonseca", title: "Head of Pattern & Cut" },
  { name: "Kenji Tanaka", title: "Fabric Sourcing Director" },
];

export default function AboutPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const cartItemsCount = useCartStore((s) => s.cartItemsCount);
  const incrementItems = useCartStore((s) => s.incrementItems);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // Section reveals
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

      // Stagger pillars
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
    <main ref={mainRef} className="w-full min-h-screen flex flex-col" style={{ backgroundColor: "#F4F0E6", color: "#111111" }}>

      {/* Hero */}
      <section className="pt-36 pb-16 px-8 md:px-12 about-reveal" style={{ opacity: 0 }}>
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // THE STORY
        </span>
        <h1
          className="font-serif font-light uppercase"
          style={{
            fontSize: "clamp(3rem, 7vw, 6rem)",
            color: "#111111",
            lineHeight: 1.0,
            letterSpacing: "0.02em",
          }}
        >
          Shirts Built
          <br />
          <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>For the Long Game</span>
        </h1>
        <p className="font-sans mt-6 max-w-lg" style={{ fontSize: "13px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
          Founded 2019 · Lisbon, Portugal
        </p>
      </section>

      {/* Divider */}
      <div className="mx-8 md:mx-12" style={{ height: "1px", backgroundColor: "rgba(17,17,17,0.06)" }} />

      {/* Brand story split */}
      <section className="px-8 md:px-12 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-start about-reveal" style={{ opacity: 0 }}>
        {/* Image */}
        <div className="md:col-span-5 relative border border-black/5 bg-[#EDE8DC]" style={{ aspectRatio: "4/5", minHeight: "320px" }}>
          <div className="absolute top-0 left-0 bottom-0" style={{ width: "3.5px", backgroundColor: "#8B1A1A", opacity: 0.8, zIndex: 1 }} />
          <Image src="/images/campaign.jpg" alt="NAAMI Atelier" fill className="object-cover" style={{ filter: "brightness(0.93)" }} sizes="(max-width: 768px) 100vw, 45vw" />
        </div>

        {/* Text */}
        <div className="md:col-span-6 md:col-start-7 flex flex-col justify-center">
          <span className="font-sans font-bold uppercase tracking-[0.25em] mb-6 block" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            The Founding
          </span>
          <p className="font-sans mb-5" style={{ fontSize: "13px", color: "rgba(17,17,17,0.75)", lineHeight: 1.75 }}>
            NAAMI was founded with a single conviction: that a well-made shirt is one of the most enduring investments a person can make in their wardrobe. Not because it is expensive, but because it is honest — made from real materials, by real hands, to last a real lifetime.
          </p>
          <p className="font-sans mb-5" style={{ fontSize: "13px", color: "rgba(17,17,17,0.75)", lineHeight: 1.75 }}>
            We started in a small atelier in Lisbon, cutting patterns on a long table and sourcing cloth from the same mills that have supplied European tailors for generations. Our first collection was fourteen shirts. It sold out in three weeks.
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.75)", lineHeight: 1.75 }}>
            Today we work with mills in Italy, Japan, and India, and every shirt still passes through the same hands, in the same atelier, under the same slow discipline. Nothing has been automated. Nothing will be.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-8 md:px-12 py-16" style={{ backgroundColor: "#EDE8DC" }}>
        <div className="mb-12 about-reveal" style={{ opacity: 0 }}>
          <span className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // THE METHOD
          </span>
          <h2
            className="font-serif font-light uppercase"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#111111", lineHeight: 1.1, letterSpacing: "0.02em" }}
          >
            Three
            <br />
            <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>Absolutes</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <div key={p.number} className="pillar-card flex flex-col" style={{ opacity: 0 }}>
              <div
                className="font-sans font-bold mb-5"
                style={{ fontSize: "8px", color: "#8B1A1A", letterSpacing: "0.3em", borderLeft: "3px solid #8B1A1A", paddingLeft: "10px" }}
              >
                {p.number} // {p.title.toUpperCase()}
              </div>
              <h3
                className="font-serif font-light uppercase mb-4"
                style={{ fontSize: "1.4rem", color: "#111111", letterSpacing: "0.03em" }}
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
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-10 block" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // THE ARCHIVE
        </span>
        <div className="flex flex-col gap-0">
          {timeline.map((t, i) => (
            <div
              key={t.year}
              className="flex gap-8 md:gap-16 py-8"
              style={{ borderTop: i === 0 ? "1px solid rgba(17,17,17,0.06)" : "none", borderBottom: "1px solid rgba(17,17,17,0.06)" }}
            >
              <div className="w-16 md:w-24 shrink-0">
                <span className="font-serif font-light" style={{ fontSize: "1.6rem", color: "#8B1A1A", letterSpacing: "0.02em" }}>
                  {t.year}
                </span>
              </div>
              <div>
                <h4 className="font-serif font-light uppercase mb-2" style={{ fontSize: "1.05rem", color: "#111111", letterSpacing: "0.03em" }}>
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
      <section className="px-8 md:px-12 py-16 about-reveal" style={{ backgroundColor: "#EDE8DC", opacity: 0 }}>
        <span className="font-sans font-bold uppercase tracking-[0.3em] mb-10 block" style={{ fontSize: "9px", color: "#8B1A1A" }}>
          NAAMI // THE TEAM
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member) => (
            <div key={member.name} className="flex flex-col">
              <div
                className="w-full bg-[#F4F0E6] border border-black/5 mb-5 flex items-center justify-center"
                style={{ aspectRatio: "1/1" }}
              >
                <div
                  className="font-serif text-4xl font-light"
                  style={{ color: "rgba(139,26,26,0.15)" }}
                >
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
              </div>
              <h4 className="font-serif font-light uppercase mb-1" style={{ fontSize: "1rem", color: "#111111", letterSpacing: "0.03em" }}>
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
          className="font-serif font-light italic mx-auto"
          style={{
            fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
            color: "rgba(17,17,17,0.85)",
            lineHeight: 1.55,
            maxWidth: "640px",
          }}
        >
          &ldquo;True luxury is found in the fall of a collar and the quiet confidence of a perfectly pressed placket.&rdquo;
        </p>
        <div className="mt-6 font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "rgba(17,17,17,0.35)" }}>
          — The Atelier Philosophy
        </div>
        <div className="mt-12">
          <Link
            href="/collection"
            className="inline-block font-sans font-bold uppercase tracking-[0.25em] py-4 px-10 transition-opacity hover:opacity-80"
            style={{ fontSize: "10px", backgroundColor: "#8B1A1A", color: "#F4F0E6" }}
          >
            Shop the Collection
          </Link>
        </div>
      </section>

      <EvanliteFooter />
    </main>
  );
}
