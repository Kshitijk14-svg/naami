"use client";

type Props = {
  onPrev: () => void;
  onNext: () => void;
  /** "light" = white translucent circle (over imagery); "dark" = dark-tinted circle (over light panels). */
  variant?: "light" | "dark";
};

const BASE =
  "absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

const VARIANTS = {
  light: "bg-white/25 hover:bg-white/40 text-white",
  dark: "bg-black/15 hover:bg-black/25 text-[#1A1212]",
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );
}

export default function CarouselArrows({ onPrev, onNext, variant = "light" }: Props) {
  const tone = VARIANTS[variant];
  return (
    <>
      <button
        type="button"
        aria-label="Previous slide"
        className={`${BASE} ${tone} left-3 md:left-6`}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        className={`${BASE} ${tone} right-3 md:right-6`}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <Chevron dir="right" />
      </button>
    </>
  );
}
