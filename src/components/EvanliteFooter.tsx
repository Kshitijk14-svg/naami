"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import DoodleSvg from "@/components/DoodleSvg";
import type { DoodleStroke } from "@/lib/doodle";
import { useDesignSettings, useDesignList } from "@/lib/useDesignSettings";
import { FOOTER_COLUMNS_DEFAULT, type FooterColumn } from "@/lib/pageContentDefaults";

// Module-scope memo: the doodle is fetched once per full page load and reused
// across SPA navigations. Any failure resolves to null (footer stays as-is).
let doodleCache: DoodleStroke[] | null | undefined; // undefined = never fetched
let doodlePromise: Promise<DoodleStroke[] | null> | null = null;

function fetchFooterDoodle(): Promise<DoodleStroke[] | null> {
  if (!doodlePromise) {
    // no-store: bypass the browser HTTP cache (including entries cached under
    // earlier header policies) so a fresh doodle shows on the next page load.
    doodlePromise = fetch("/api/design/footer-doodle", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const strokes = data?.doodle?.strokes;
        doodleCache = Array.isArray(strokes) && strokes.length > 0 ? strokes : null;
        return doodleCache;
      })
      .catch(() => {
        doodleCache = null;
        return null;
      });
  }
  return doodlePromise;
}

function useFooterDoodle(): DoodleStroke[] | null {
  const [doodle, setDoodle] = useState<DoodleStroke[] | null>(doodleCache ?? null);
  useEffect(() => {
    let mounted = true;
    if (doodleCache === undefined) {
      fetchFooterDoodle().then((d) => {
        if (mounted) setDoodle(d);
      });
    }
    return () => {
      mounted = false;
    };
  }, []);
  return doodle;
}

export default function EvanliteFooter() {
  // Click-to-expand accordion at every breakpoint; multiple columns may be open.
  const [openCols, setOpenCols] = useState<string[]>([]);
  const doodle = useFooterDoodle();
  const cms = useDesignSettings();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

  const columns = useDesignList<FooterColumn>("footer_columns_json", FOOTER_COLUMNS_DEFAULT);

  // The Contact Support mail link is still injected from the env var into
  // whichever column is titled "Customer Care" (admin manages the rest).
  const footerData: FooterColumn[] = columns.map((col) =>
    contactEmail && col.title.trim().toLowerCase() === "customer care"
      ? { ...col, links: [...col.links, { label: "Contact Support", href: `mailto:${contactEmail}` }] }
      : col
  );

  const toggleAccordion = (title: string) => {
    setOpenCols((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <footer
      className="w-full px-4 md:px-12 pt-8 pb-6 md:pt-12 flex flex-col gap-6 md:gap-8 relative overflow-hidden"
      style={{
        backgroundColor: "#F8F1E5", // Warm muted cream logo background accent
        borderTop: "1px solid rgba(139, 26, 26, 0.15)",
      }}
    >
      {/* Footer grid body */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-12 w-full z-10">
        {footerData.map((col) => {
          const isOpen = openCols.includes(col.title);

          return (
            <div
              key={col.title}
              className="flex flex-col border-b border-black/5 pb-3"
            >
              {/* Collapsible trigger / heading */}
              <div
                onClick={() => toggleAccordion(col.title)}
                className="flex items-center justify-between cursor-pointer py-3 md:py-2"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
              >
                <h4
                  className="font-sans font-bold uppercase tracking-[0.25em]"
                  style={{ fontSize: "11px", color: "#5B1C1C" }}
                >
                  {col.title}
                </h4>
                {/* Expand icon */}
                <div
                  className="w-5 h-5 flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: "#5B1C1C",
                    opacity: 0.6,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Collapsible target — CSS-grid rows transition */}
              <div
                className={`wt-collapse__target ${
                  isOpen ? "wt-collapse__target--active" : ""
                }`}
              >
                <div>
                  <ul className="flex flex-col gap-3 font-sans mt-4" style={{ fontSize: "11px" }}>
                    {col.links.map((link) => {
                      const isMailto = link.href.startsWith("mailto:");
                      const linkClassName =
                        "text-[#1A1212]/60 hover:text-[#5B1C1C] transition-colors relative group py-1 inline-block";
                      const underline = (
                        <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#5B1C1C] transition-all duration-300 group-hover:w-full" />
                      );
                      return (
                        <li key={link.label}>
                          {isMailto ? (
                            <a href={link.href} className={linkClassName} data-cursor-text="EXPLORE">
                              {link.label}
                              {underline}
                            </a>
                          ) : (
                            <Link href={link.href} className={linkClassName} data-cursor-text="EXPLORE">
                              {link.label}
                              {underline}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom area — copyright */}
      <div
        className="w-full pt-6 md:pt-8 z-10"
        style={{ borderTop: "1px solid rgba(139, 26, 26, 0.08)" }}
      >
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}
          >
            {cms.footer_copyright}
          </div>
          <div
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "rgba(17,17,17,0.22)" }}
          >
            {cms.footer_tagline}
          </div>
        </div>
      </div>

      {/* Massive Brand Watermark Logo at the bottom of the page */}
      {doodle ? (
        /* Doodle present: wordmark shrinks left, doodle takes the right column */
        <div className="w-full mt-4 md:mt-8 z-0 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-8">
          <div
            className="order-2 md:order-1 min-w-0 mx-auto md:mx-0 w-[38vw] md:w-[26vw] select-none pointer-events-none"
            style={{ opacity: 0.075, transform: "translateY(15%)", willChange: "transform" }}
          >
            <Image
              src="/images/naami-wordmark.png"
              alt=""
              width={415}
              height={295}
              className="w-full h-auto"
              style={{ display: "block" }}
            />
          </div>
          <div className="order-1 md:order-2 w-[42%] mx-auto md:mx-0 md:w-[30%] md:max-w-[420px] md:shrink-0 md:pb-[1%] pointer-events-none select-none">
            <DoodleSvg strokes={doodle} className="w-full h-auto" faded />
          </div>
        </div>
      ) : (
        <div
          className="select-none pointer-events-none mt-4 md:mt-8 z-0 mx-auto w-[62vw] md:w-[44vw]"
          style={{ opacity: 0.075, transform: "translateY(15%)", willChange: "transform" }}
        >
          <Image
            src="/images/naami-wordmark.png"
            alt=""
            width={415}
            height={295}
            className="w-full h-auto"
            style={{ display: "block", marginInline: "auto" }}
          />
        </div>
      )}
    </footer>
  );
}
