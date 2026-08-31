"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function CustomCursor() {
  const pathname = usePathname();
  const svgRef = useRef<SVGSVGElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  // Toggle native-cursor hiding to match the current route/pointer type.
  useEffect(() => {
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const isAdmin = pathname.startsWith("/admin");
    const shouldHide = !isCoarse && !isAdmin;
    document.documentElement.classList.toggle("naami-cursor-active", shouldHide);

    return () => {
      document.documentElement.classList.remove("naami-cursor-active");
    };
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const svgEl = svgRef.current;
    const button = buttonRef.current;
    const dot = dotRef.current;
    const path = pathRef.current;
    const label = labelRef.current;
    if (!svgEl || !button || !dot || !path || !label) return;

    // ── Mouse position ─────────────────────────────────────────
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // ── Button physics state — parked off-screen until first reveal ──
    const pos = { x: -500, y: -500 };
    const vel = { x: 0, y: 0 };
    let visible = false;

    // ── Physics constants ────────────────────────────────────────
    const STIFFNESS = 0.03;  // spring constant pulling pearl toward mouse
    const DAMPING = 0.84;  // damping factor to allow organic swinging/bouncing
    const GRAVITY = 2.7;   // constant downward gravitational pull

    // ── Mouse velocity tracking ─────────────────────────────────
    let prevMouseX = mouse.x;
    let prevMouseY = mouse.y;
    const smoothVel = { x: 0, y: 0 };

    let raf: number;

    const tick = () => {
      smoothVel.x *= 0.93;
      smoothVel.y *= 0.93;

      // Spring force (Hooke's Law with rest length = 0 for stretchable thread) + Gravity
      const forceX = STIFFNESS * (mouse.x - pos.x);
      const forceY = STIFFNESS * (mouse.y - pos.y) + GRAVITY;

      vel.x += forceX;
      vel.y += forceY;
      vel.x *= DAMPING;
      vel.y *= DAMPING;
      pos.x += vel.x;
      pos.y += vel.y;

      button.style.transform =
        `translate(calc(${pos.x}px - 50%), calc(${pos.y}px - 50%))`;

      // ── Dot tracks the true pointer position, no lag ─────────
      dot.style.transform =
        `translate(calc(${mouse.x}px - 50%), calc(${mouse.y}px - 50%))`;

      // ── Draw rubber-band string ─────────────────────────────
      const bx = pos.x;
      const by = pos.y;
      const mx = mouse.x;
      const my = mouse.y;
      const ddx = bx - mx;
      const ddy = by - my;
      const d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;

      const perpX = -ddy / d;
      const perpY = ddx / d;
      const velDotPerp = smoothVel.x * perpX + smoothVel.y * perpY;
      const bowStrength = velDotPerp * 5;

      // Add gravity sag to the control point of the curve
      const cpx = (mx + bx) / 2 + perpX * bowStrength;
      const cpy = (my + by) / 2 + perpY * bowStrength + (GRAVITY * 3.5);

      path.setAttribute("d", `M ${mx} ${my} Q ${cpx} ${cpy} ${bx} ${by}`);
      path.setAttribute("opacity", String(0.25 + Math.min(0.65, (d / 120) * 0.65)));

      raf = requestAnimationFrame(tick);
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (!visible) {
        // Snap to cursor on first reveal so no flying-in effect
        pos.x = e.clientX;
        pos.y = e.clientY + 70;
        visible = true;
        button.style.opacity = "1";
        dot.style.opacity = "1";
        svgEl.style.opacity = "1";
      }

      const rawVx = e.clientX - prevMouseX;
      const rawVy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      smoothVel.x += (rawVx - smoothVel.x) * 0.5;
      smoothVel.y += (rawVy - smoothVel.y) * 0.5;

      // Dynamically check if hovering over something with cursor text
      const target = e.target as HTMLElement;
      const hoverable = target.closest<HTMLElement>("[data-cursor-text], a, button");
      if (hoverable) {
        const text = hoverable.getAttribute("data-cursor-text") || "";
        if (text) {
          label.innerText = text;
          label.style.opacity = "1";
          label.style.transform = "scale(1) translateY(-50%)";
        } else {
          label.style.opacity = "0";
          label.style.transform = "scale(0.8) translateY(-50%)";
        }
      } else {
        label.style.opacity = "0";
        label.style.transform = "scale(0.8) translateY(-50%)";
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
    // Re-run on every route change: when this component returns null (e.g. on
    // /admin) and later re-mounts its nodes, the listener below must re-acquire
    // the fresh refs — otherwise it keeps driving detached nodes and the visible
    // ones stay at opacity 0.
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Full-screen SVG — rubber band string */}
      <svg
        ref={svgRef}
        className="hidden md:block fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2147483645, opacity: 0, transition: "opacity 0.4s ease" }}
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          stroke="#5B1C1C"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          fill="none"
          opacity="0"
          d="M 0 0 Q 0 0 0 0"
        />
      </svg>

      {/* Small dot marking the true pointer position (replaces the native cursor) */}
      <div
        ref={dotRef}
        className="hidden md:block fixed top-0 left-0 pointer-events-none"
        style={{
          width: 12,
          height: 12,
          zIndex: 2147483647,
          willChange: "transform",
          opacity: 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <div
          className="select-none"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            backgroundColor: "#5B1C1C",
            border: "1.5px solid #FFF9EF",
            boxShadow: "0 0 6px rgba(139,26,26,0.4)",
          }}
        />
      </div>

      {/* Silver pearl medallion — hangs from the dot via the elastic string */}
      <div
        ref={buttonRef}
        className="hidden md:block fixed top-0 left-0 pointer-events-none"
        style={{
          width: 48,
          height: 48,
          zIndex: 2147483646,
          willChange: "transform",
          opacity: 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silver-pearl.png"
          alt="sling pearl"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
          className="select-none"
          draggable={false}
        />

        {/* Text label floating to the right of the pearl */}
        <div
          ref={labelRef}
          className="absolute top-1/2 font-sans font-bold uppercase tracking-[0.25em] text-[#5B1C1C] opacity-0 pointer-events-none"
          style={{
            left: 56,
            fontSize: "8.5px",
            whiteSpace: "nowrap",
            backgroundColor: "#FFF9EF",
            padding: "5px 10px",
            border: "1px solid rgba(139, 26, 26, 0.25)",
            borderRadius: "3px",
            transition: "opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1), transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
            transform: "scale(0.8) translateY(-50%)",
            transformOrigin: "left center",
            boxShadow: "0 4px 15px rgba(139, 26, 26, 0.12)",
          }}
        />
      </div>
    </>
  );
}
