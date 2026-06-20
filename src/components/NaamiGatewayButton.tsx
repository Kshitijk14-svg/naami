'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';

export default function NaamiGatewayButton({ label = "Discover Collection" }: { label?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGGElement>(null);
  const leftArchRef = useRef<SVGPathElement>(null);
  const rightArchRef = useRef<SVGPathElement>(null);
  const innerMRef = useRef<SVGPathElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    // 1. Gently expand text tracking & scale the mark on hover
    gsap.to(svgRef.current, {
      scale: 1.08,
      duration: 0.5,
      ease: 'power2.out'
    });

    // 2. Subtle shine/glow effect on the polished crimson components
    gsap.to([leftArchRef.current, rightArchRef.current, innerMRef.current], {
      stroke: '#8B1A1A', // Turn to crimson accent
      duration: 0.4,
      ease: 'power2.out'
    });
  };

  const handleMouseLeave = () => {
    // Reset back to premium charcoal theme state
    gsap.to(svgRef.current, { scale: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to([leftArchRef.current, rightArchRef.current, innerMRef.current], {
      stroke: '#111111',
      duration: 0.4,
      ease: 'power2.out'
    });
  };

  const handleClick = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    const tl = gsap.timeline({
      onComplete: () => {
        // Securely push route change once animation completes
        router.push('/collection');
      }
    });

    // Step 1: Drop the "naami" text off-screen downwards with gravity fade
    tl.to(textRef.current, {
      y: 40,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);

    // Step 2: Split the arches apart horizontally (Left half goes left, right half goes right)
    tl.to(leftArchRef.current, { x: -50, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
    tl.to(rightArchRef.current, { x: 50, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
    tl.to(innerMRef.current, { scaleY: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' }, 0.1);

    // Step 3: Align circle start point and expand it globally
    gsap.set(overlayRef.current, {
      display: 'block',
      clipPath: `circle(0% at ${x}px ${y}px)`
    });

    tl.to(overlayRef.current, {
      clipPath: `circle(150% at ${x}px ${y}px)`,
      duration: 1.2,
      ease: 'power4.inOut'
    }, 0.2);
  };

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col items-center justify-center py-1 cursor-pointer relative w-full overflow-hidden"
    >
      <span className="text-[10px] tracking-[0.4em] text-[#111111]/45 uppercase mb-3 block font-light">
        {label}
      </span>

      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="focus:outline-none z-10 transition-transform"
        aria-label="Enter Naami Collection"
      >
        {/* Exact Symmetrical Path Representation of your uploaded logo */}
        <svg
          ref={svgRef}
          width="80"
          height="120"
          viewBox="0 0 120 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="will-change-transform"
        >
          {/* LEFT HALF OF OUTER ARCH */}
          <path
            ref={leftArchRef}
            d="M24 90 H36 M30 90 V50 A 30 30 0 0 1 60 20"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="will-change-transform"
          />
          
          {/* RIGHT HALF OF OUTER ARCH */}
          <path
            ref={rightArchRef}
            d="M96 90 H84 M90 90 V50 A 30 30 0 0 0 60 20"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="will-change-transform"
          />

          {/* INNER LOWERCASE 'M' VAULTS */}
          <path
            ref={innerMRef}
            d="M30 65 A 15 15 0 0 1 60 65 V90 M54 90 H66 M60 65 A 15 15 0 0 1 90 65"
            stroke="#111111"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="will-change-transform"
          />

          {/* COMPRESSED TYPOGRAPHY: naami */}
          <g ref={textRef} className="will-change-transform">
            <text
              x="60"
              y="135"
              fill="#111111"
              fontFamily="var(--font-serif), serif"
              fontSize="24"
              fontWeight="300"
              letterSpacing="2.5"
              textAnchor="middle"
              className="lowercase tracking-[0.1em]"
            >
              naami
            </text>
          </g>
        </svg>
      </button>

      {/* Portal Overlay mounted directly under document.body */}
      {mounted && createPortal(
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-[#EDE8DC] z-[100000] hidden"
          style={{ pointerEvents: 'none' }}
        />,
        document.body
      )}
    </div>
  );
}
