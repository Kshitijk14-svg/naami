"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface BeadPosition {
  x: number;
  y: number;
}

interface CursorState {
  hoverText: string;
  isHovering: boolean;
}

// Determine if a bg color (rgb string) is "light" so we can invert the cursor
function isLightColor(colorStr: string): boolean {
  const match = colorStr.match(/\d+/g);
  if (!match || match.length < 3) return false;
  const [r, g, b] = match.map(Number);
  // Perceived luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.45;
}

// Walk up the DOM from a point to find the first element with a non-transparent bg
function getBackgroundColorAt(x: number, y: number): string {
  // Temporarily hide pointer-events-none overlay so elementFromPoint works
  const els = document.elementsFromPoint(x, y) as HTMLElement[];
  for (const el of els) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return bg;
    }
  }
  return "rgb(8, 12, 20)"; // fallback: dark
}

export default function TwinBeadCursor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leaderCircleRef = useRef<SVGCircleElement>(null);
  const trailerCircleRef = useRef<SVGCircleElement>(null);
  const slingPathRef = useRef<SVGPathElement>(null);
  const hoverTextRef = useRef<SVGTextElement>(null);
  const leaderRingRef = useRef<SVGCircleElement>(null);

  const leaderPos = useRef<BeadPosition>({ x: -100, y: -100 });
  const trailerPos = useRef<BeadPosition>({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);

  const [cursorState, setCursorState] = useState<CursorState>({
    hoverText: "VIEW",
    isHovering: false,
  });
  const cursorStateRef = useRef<CursorState>(cursorState);

  // Track whether we're on a light background
  const isLightRef = useRef<boolean>(false);

  useEffect(() => {
    cursorStateRef.current = cursorState;
  }, [cursorState]);

  useEffect(() => {
    // Touch devices: bail out entirely
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Hide native cursor
    document.documentElement.style.cursor = "none";

    const onMouseMove = (e: MouseEvent) => {
      leaderPos.current.x = e.clientX;
      leaderPos.current.y = e.clientY;

      const target = e.target as HTMLElement;
      const hoverable = target.closest<HTMLElement>(
        "[data-cursor-text], a, button"
      );

      const nextText =
        hoverable?.getAttribute("data-cursor-text") ?? "VIEW";
      const nextHovering = !!hoverable;

      if (
        nextHovering !== cursorStateRef.current.isHovering ||
        nextText !== cursorStateRef.current.hoverText
      ) {
        setCursorState({ hoverText: nextText, isHovering: nextHovering });
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // RAF loop: lerp trailer, update SVG, adapt colors
    const LERP = 0.085;

    // Color themes
    const DARK_BG = {
      leaderFill: "#D4AF37",     // brass gold
      trailerFill: "#FAF8F5",    // ecru
      slingStroke: "#FAF8F5",
      glowLeaderColor: "#D4AF37",
      glowTrailerColor: "#FAF8F5",
      ringStroke: "#D4AF37",
      textFill: "#FAF8F5",
    };
    const LIGHT_BG = {
      leaderFill: "#1a1a2e",     // dark navy — pops on light
      trailerFill: "#080C14",    // near-black
      slingStroke: "#080C14",
      glowLeaderColor: "#1a1a2e",
      glowTrailerColor: "#080C14",
      ringStroke: "#080C14",
      textFill: "#080C14",
    };

    // Get direct DOM refs to the SVG filter flood elements
    const svgEl = svgRef.current;

    let lastIsLight = false;
    let colorSampleFrame = 0;

    const applyTheme = (light: boolean) => {
      const theme = light ? LIGHT_BG : DARK_BG;

      if (leaderCircleRef.current) {
        leaderCircleRef.current.setAttribute("fill", theme.leaderFill);
      }
      if (trailerCircleRef.current) {
        trailerCircleRef.current.setAttribute("fill", theme.trailerFill);
      }
      if (slingPathRef.current) {
        slingPathRef.current.setAttribute("stroke", theme.slingStroke);
      }
      if (leaderRingRef.current) {
        leaderRingRef.current.setAttribute("stroke", theme.ringStroke);
      }
      if (hoverTextRef.current) {
        hoverTextRef.current.setAttribute("fill", theme.textFill);
      }

      // Update glow filter flood colors
      if (svgEl) {
        const brassFlood = svgEl.querySelector<SVGElement>("#brass-glow feFlood");
        const ecruFlood = svgEl.querySelector<SVGElement>("#ecru-glow feFlood");
        if (brassFlood) brassFlood.setAttribute("flood-color", theme.glowLeaderColor);
        if (ecruFlood) ecruFlood.setAttribute("flood-color", theme.glowTrailerColor);
      }
    };

    const tick = () => {
      // Lerp trailer toward leader
      trailerPos.current.x +=
        (leaderPos.current.x - trailerPos.current.x) * LERP;
      trailerPos.current.y +=
        (leaderPos.current.y - trailerPos.current.y) * LERP;

      const lx = leaderPos.current.x;
      const ly = leaderPos.current.y;
      const tx = trailerPos.current.x;
      const ty = trailerPos.current.y;

      // Update SVG elements directly
      if (leaderCircleRef.current) {
        leaderCircleRef.current.setAttribute("cx", String(lx));
        leaderCircleRef.current.setAttribute("cy", String(ly));
      }
      if (leaderRingRef.current) {
        leaderRingRef.current.setAttribute("cx", String(lx));
        leaderRingRef.current.setAttribute("cy", String(ly));
      }
      if (trailerCircleRef.current) {
        trailerCircleRef.current.setAttribute("cx", String(tx));
        trailerCircleRef.current.setAttribute("cy", String(ty));
      }
      if (slingPathRef.current) {
        const dx = lx - tx;
        const dy = ly - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);
        const bulge = Math.min(dist * 0.15, 20);
        const mx = (lx + tx) / 2 + perpX * bulge;
        const my = (ly + ty) / 2 + perpY * bulge;
        slingPathRef.current.setAttribute(
          "d",
          `M ${tx} ${ty} Q ${mx} ${my} ${lx} ${ly}`
        );
      }
      if (hoverTextRef.current) {
        hoverTextRef.current.setAttribute("x", String(lx));
        hoverTextRef.current.setAttribute("y", String(ly + 1));
      }

      // Sample background color every 4 frames to avoid layout thrash
      colorSampleFrame++;
      if (colorSampleFrame % 4 === 0 && lx > 0 && ly > 0) {
        const bg = getBackgroundColorAt(lx, ly);
        const light = isLightColor(bg);
        isLightRef.current = light;

        if (light !== lastIsLight) {
          lastIsLight = light;
          applyTheme(light);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
      document.documentElement.style.cursor = "";
    };
  }, []);

  // GSAP hover state transitions on leader bead
  useEffect(() => {
    if (!leaderCircleRef.current || !leaderRingRef.current) return;

    if (cursorState.isHovering) {
      gsap.to(leaderCircleRef.current, {
        attr: { r: 14, fillOpacity: 0.15 },
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(leaderRingRef.current, {
        attr: { r: 14 },
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(hoverTextRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
      });
    } else {
      gsap.to(leaderCircleRef.current, {
        attr: { r: 5, fillOpacity: 1 },
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(leaderRingRef.current, {
        attr: { r: 5 },
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(hoverTextRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.out",
      });
    }
  }, [cursorState.isHovering]);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 w-full h-full pointer-events-none hw-accelerate"
      style={{ zIndex: 110 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="brass-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor="#D4AF37" floodOpacity="0.8" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ecru-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor="#FAF8F5" floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Elastic sling tether path */}
      <path
        ref={slingPathRef}
        stroke="#FAF8F5"
        strokeWidth="0.8"
        strokeDasharray="3 5"
        fill="none"
        opacity="0.55"
        d="M -100 -100 Q -100 -100 -100 -100"
      />

      {/* Trailer bead — follows with lag */}
      <circle
        ref={trailerCircleRef}
        r="3.5"
        fill="#FAF8F5"
        cx="-100"
        cy="-100"
        filter="url(#ecru-glow)"
        opacity="0.85"
      />

      {/* Leader ring — visible only on hover (hover frame) */}
      <circle
        ref={leaderRingRef}
        r="5"
        fill="transparent"
        stroke="#D4AF37"
        strokeWidth="1.2"
        cx="-100"
        cy="-100"
        opacity="0"
      />

      {/* Leader shining brass bead */}
      <circle
        ref={leaderCircleRef}
        r="5"
        fill="#D4AF37"
        cx="-100"
        cy="-100"
        filter="url(#brass-glow)"
      />

      {/* Hover text label */}
      <text
        ref={hoverTextRef}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FAF8F5"
        fontSize="7"
        fontFamily="var(--font-inter), sans-serif"
        fontWeight="700"
        letterSpacing="0.12em"
        opacity="0"
        style={{ userSelect: "none", pointerEvents: "none" }}
        x="-100"
        y="-100"
      >
        {cursorState.hoverText}
      </text>
    </svg>
  );
}
