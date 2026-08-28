'use client';

import React, { useRef, useState, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';

/**
 * Geometry measured off brand.png (1080x1350) by pixel scanline analysis, then
 * translated by (-366, -306) into a 350x470 viewBox.
 *
 * The mark's strokes are *modulated*, not uniform — the arch is 11 units thick
 * at the apex and 26 at the legs. That falls out of drawing it as the region
 * between an outer circle (r=140) and an inner ellipse (114.5 x 130) sharing a
 * centre, which reproduces every measured section to within ~3 units. The same
 * two-curve construction gives the inner vaults their 6 -> 11 taper. Hence
 * filled paths rather than stroked ones.
 *
 *   source            -> local
 *   centre x 541      -> 175
 *   springing y 452   -> 146
 *   baseline y 770    -> 464
 *   legs 401/681 (outer), 426.5/655.5 (inner) -> 35/315, 60.5/289.5
 */
const VB = { w: 350, h: 470 };
const CX = 175;

const MAROON = '#5B1C1C';

const PATH = {
  // Left half: up the outer leg, quarter of the outer circle to the apex, then
  // the inner ellipse back down. Halves meet flush on the axis at x = CX.
  archLeft:
    'M 35,464 L 35,146 A 140,140 0 0 1 175,6 L 175,16 A 114.5,130 0 0 0 60.5,146 L 60.5,464 Z',
  archRight:
    'M 315,464 L 315,146 A 140,140 0 0 0 175,6 L 175,16 A 114.5,130 0 0 1 289.5,146 L 289.5,464 Z',

  // Flared serif feet: 26 units wide at the leg, splaying to 85 at the base
  // over the last 14 units.
  footLeft: 'M 4.5,465 Q 32,464 35,451 L 60.5,451 Q 63.5,464 89.5,465 Z',
  footRight: 'M 260.5,465 Q 287,464 289.5,451 L 315,451 Q 317.5,464 345.5,465 Z',

  // Inner twin vaults, same annulus construction (outer 55.75x38, inner
  // 46.5x32). Their outer limbs run into the legs; their inner limbs land on
  // the shared stem.
  vaultLeft: 'M 54,250 A 55.75,38 0 0 1 165.5,250 L 156.25,250 A 46.5,32 0 0 0 63.25,250 Z',
  vaultRight: 'M 184.5,250 A 55.75,38 0 0 1 296,250 L 286.75,250 A 46.5,32 0 0 0 193.75,250 Z',
  stem: 'M 165,244 L 185,244 L 185,464 L 165,464 Z',
};

const MARK_W = 40;
const MARK_H = Math.round((MARK_W * VB.h) / VB.w);

/**
 * Lockup proportions, also measured: the wordmark spans 365 units against the
 * arch's 280 (1.30x) and sits 46 units below the feet (0.10 arch-heights).
 * August renders "naami" at ~1.45x its font-size in width.
 */
const WORDMARK_FS = Math.round((MARK_W * 1.3) / 1.45);
const WORDMARK_GAP = Math.round(MARK_H * 0.1);

export default function NaamiGatewayButton({
  label = 'Discover Collection',
  href = '/collection',
}: {
  label?: string;
  href?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const leftHalfRef = useRef<SVGGElement>(null);
  const rightHalfRef = useRef<SVGGElement>(null);
  const innerRef = useRef<SVGGElement>(null);
  const wipeRef = useRef<SVGRectElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const hoverTl = useRef<gsap.core.Timeline | null>(null);
  const exitTl = useRef<gsap.core.Timeline | null>(null);

  const [mounted, setMounted] = useState(false);

  // Two of these render per page, so the clipPath id has to be unique.
  const clipId = `gw-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(
    () => () => {
      hoverTl.current?.kill();
      exitTl.current?.kill();
    },
    []
  );

  const prefersReducedMotion = useCallback(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Filled paths can't be drawn on with stroke-dashoffset, so the gateway
  // reveals itself under a clip rect that rises from the ground instead.
  const handleMouseEnter = () => {
    if (prefersReducedMotion() || !wipeRef.current) return;
    hoverTl.current?.kill();
    gsap.set(wipeRef.current, { attr: { y: VB.h, height: 0 } });
    hoverTl.current = gsap.timeline().to(wipeRef.current, {
      attr: { y: -20, height: VB.h + 20 },
      duration: 0.7,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    hoverTl.current?.kill();
    // Always settle fully revealed, whatever the wipe was mid-way through.
    if (wipeRef.current) gsap.set(wipeRef.current, { attr: { y: -20, height: VB.h + 20 } });
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab, new window) behave natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    if (prefersReducedMotion()) {
      router.push(href);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    exitTl.current?.kill();
    const tl = gsap.timeline({ onComplete: () => router.push(href) });
    exitTl.current = tl;

    // 1. Wordmark drops away (HTML node, so px).
    tl.to(wordmarkRef.current, { y: 40, opacity: 0, duration: 0.4, ease: 'power2.in' }, 0);

    // 2. Arch halves split, each carrying its own foot. One viewBox width
    //    always clears the frame.
    tl.to(leftHalfRef.current, { x: -VB.w, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
    tl.to(rightHalfRef.current, { x: VB.w, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
    tl.to(innerRef.current, { scaleY: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' }, 0.1);

    // 3. Cream wipe expands from the button's centre.
    gsap.set(overlayRef.current, { display: 'block', clipPath: `circle(0% at ${x}px ${y}px)` });
    tl.to(
      overlayRef.current,
      { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 1.2, ease: 'power4.inOut' },
      0.2
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center py-1 relative w-full overflow-hidden"
    >
      <span className="text-[10px] tracking-[0.4em] text-[#1A1212]/45 uppercase mb-3 block font-light">
        {label}
      </span>

      <a
        href={href}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-cursor-text="ENTER"
        className="focus:outline-none z-10 flex flex-col items-center cursor-pointer"
        aria-label="Enter Naami Collection"
      >
        <svg
          width={MARK_W}
          height={MARK_H}
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              {/* Wider than the viewBox so the split-apart halves aren't
                  clipped horizontally by the reveal. */}
              <rect ref={wipeRef} x={-400} y={-20} width={1150} height={VB.h + 20} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            <g ref={leftHalfRef} className="will-change-transform">
              <path d={PATH.archLeft} fill={MAROON} />
              <path d={PATH.footLeft} fill={MAROON} />
            </g>

            <g ref={rightHalfRef} className="will-change-transform">
              <path d={PATH.archRight} fill={MAROON} />
              <path d={PATH.footRight} fill={MAROON} />
            </g>

            <g
              ref={innerRef}
              className="will-change-transform"
              style={{ transformOrigin: `${CX}px 464px` }}
            >
              <path d={PATH.vaultLeft} fill={MAROON} />
              <path d={PATH.vaultRight} fill={MAROON} />
              <path d={PATH.stem} fill={MAROON} />
            </g>
          </g>
        </svg>

        <span
          ref={wordmarkRef}
          className="font-wordmark lowercase block will-change-transform"
          style={{
            color: MAROON,
            fontSize: `${WORDMARK_FS}px`,
            lineHeight: 1.1,
            letterSpacing: '0.01em',
            marginTop: `${WORDMARK_GAP}px`,
          }}
        >
          naami
        </span>
      </a>

      {mounted &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 bg-[#F8F1E5] z-[100000] hidden"
            style={{ pointerEvents: 'none' }}
          />,
          document.body
        )}
    </div>
  );
}
