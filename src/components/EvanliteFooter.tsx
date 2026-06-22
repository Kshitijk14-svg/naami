"use client";

import React, { useState } from "react";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const footerData: FooterColumn[] = [
  {
    title: "Collections",
    links: [
      { label: "Oxford Stripe Shirt", href: "#" },
      { label: "Linen Natural Camp", href: "#" },
      { label: "Sashiko Boro Overshirt", href: "#" },
      { label: "Chambray Work Shirt", href: "#" },
      { label: "Bestseller Classics", href: "#" },
    ],
  },
  {
    title: "Philosophy",
    links: [
      { label: "Loom Heritage", href: "#" },
      { label: "Shirt Care Guide", href: "#" },
      { label: "Mother-of-Pearl Buttons", href: "#" },
      { label: "Natural Dye Process", href: "#" },
      { label: "Studio Manufacture", href: "#" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Atelier Guarantee", href: "#" },
      { label: "Button & Thread Service", href: "#" },
      { label: "Secure Payments", href: "#" },
      { label: "Returns & Exchanges", href: "#" },
      { label: "Global Stockists", href: "#" },
    ],
  },
  {
    title: "Naami Universe",
    links: [
      { label: "Naami Journal", href: "#" },
      { label: "Campaign Archives", href: "#" },
      { label: "Instagram Feed", href: "#" },
      { label: "Studio Address", href: "#" },
      { label: "Contact Support", href: "#" },
    ],
  },
];

export default function EvanliteFooter() {
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const toggleAccordion = (title: string) => {
    if (activeAccordion === title) {
      setActiveAccordion(null);
    } else {
      setActiveAccordion(title);
    }
  };

  return (
    <footer
      className="w-full px-6 md:px-12 pt-12 pb-6 flex flex-col gap-8 relative overflow-hidden"
      style={{
        backgroundColor: "#EDE8DC", // Warm muted cream logo background accent
        borderTop: "1px solid rgba(139, 26, 26, 0.15)",
      }}
    >
      {/* Footer grid body */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 w-full z-10">
        {footerData.map((col) => {
          const isOpen = activeAccordion === col.title;

          return (
            <div
              key={col.title}
              className="flex flex-col border-b border-black/5 md:border-none pb-4 md:pb-0"
            >
              {/* Trigger - Mobile Collapsible Trigger / Desktop Heading */}
              <div
                onClick={() => toggleAccordion(col.title)}
                className="flex items-center justify-between md:cursor-default cursor-pointer py-2 md:py-0"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
              >
                <h4
                  className="font-sans font-bold uppercase tracking-[0.25em]"
                  style={{ fontSize: "11px", color: "#8B1A1A" }}
                >
                  {col.title}
                </h4>
                {/* Arrow Icon visible only on mobile */}
                <div
                  className="md:hidden w-4 h-4 flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    color: "#111111",
                    opacity: 0.5,
                  }}
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Collapsible Targets — Grid transition for mobile, always visible on desktop */}
              <div
                className={`wt-collapse__target md:grid-rows-1 md:mt-6 ${
                  isOpen ? "wt-collapse__target--active" : ""
                }`}
              >
                <div>
                  <ul className="flex flex-col gap-3 font-sans" style={{ fontSize: "11px" }}>
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-[#111111]/60 hover:text-[#8B1A1A] transition-colors relative group py-1 inline-block"
                          data-cursor-text="EXPLORE"
                        >
                          {link.label}
                          {/* Animated underline effect */}
                          <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#8B1A1A] transition-all duration-300 group-hover:w-full" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom area with payment badges, copyright, and brand monogram indicator */}
      <div
        className="w-full flex flex-col md:flex-row items-center justify-between gap-8 pt-8 z-10"
        style={{ borderTop: "1px solid rgba(139, 26, 26, 0.08)" }}
      >
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}
          >
            © 2026 Naami — All rights reserved
          </div>
          <div
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "rgba(17,17,17,0.22)" }}
          >
            Crafted with precision. Made to last lifetimes.
          </div>
        </div>

        {/* Payment Methods (Sleek minimalist SVGs) */}
        <div className="flex items-center gap-4 opacity-40 hover:opacity-75 transition-opacity duration-300">
          {/* Visa SVG */}
          <svg className="w-8 h-5" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="38" height="24" rx="2" fill="black" fillOpacity="0.04" />
            <path
              d="M14 15.5l.6-3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 0H15.2l-.2-.9h-2.4l-.2.9H10.6l1.4-6.5h1.5zm-5-.3l.4-1.8c.7.3 1.4.5 2.1.4.5 0 .8-.3.5-.7-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-.8-.8-.4-2 .5-2.5.6-.3 1.3-.4 2-.4 1.2 0 2 .1 2.5.2-.1.6-.2 1.1-.4 1.7-.5-.2-1-.3-1.5-.3-.3 0-.6 0-.8.1-.2 0-.2.1-.3.2-.2.2 0 .5.3.7l.5.4c.4.2.8.4 1.1.6.5.3.8.7.7 1.3 0 1-.7 1.8-1.7 2.1-1 .3-2.1.3-3.1.1z"
              fill="#111111"
            />
          </svg>
          {/* Mastercard SVG */}
          <svg className="w-8 h-5" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="38" height="24" rx="2" fill="black" fillOpacity="0.04" />
            <circle cx="15" cy="12" r="5" fill="#111111" fillOpacity="0.15" />
            <circle cx="23" cy="12" r="5" fill="#8B1A1A" fillOpacity="0.5" />
          </svg>
          {/* PayPal SVG */}
          <svg className="w-8 h-5" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="38" height="24" rx="2" fill="black" fillOpacity="0.04" />
            <path
              d="M14 16.5h2c.8 0 1.5-.5 1.7-1.3L19 7.5h-3.1c-.2 0-.4.2-.4.4l-1.5 8.6z"
              fill="#111111"
              fillOpacity="0.4"
            />
          </svg>
        </div>

        {/* Monogram branding indicator */}
        <div className="flex items-center gap-1">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#8B1A1A",
              boxShadow: "0 0 8px rgba(139,26,26,0.3)",
            }}
          />
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              backgroundColor: "#111111",
              marginLeft: 4,
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* Massive Brand Watermark Logo at the bottom of the page */}
      <div
        className="w-full text-center select-none pointer-events-none mt-8 z-0"
        style={{
          fontFamily: "var(--font-serif), serif",
          fontSize: "16vw",
          fontWeight: "700",
          letterSpacing: "0.25em",
          lineHeight: "0.8",
          color: "#8B1A1A",
          opacity: 0.075,
          transform: "translateY(15%)",
          willChange: "transform",
        }}
      >
        NAAMI
      </div>
    </footer>
  );
}
