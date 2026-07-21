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
      stroke: '#5B1C1C', // Turn to crimson accent
      duration: 0.4,
      ease: 'power2.out'
    });
  };

  const handleMouseLeave = () => {
    // Reset back to premium charcoal theme state
    gsap.to(svgRef.current, { scale: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to([leftArchRef.current, rightArchRef.current, innerMRef.current], {
      stroke: '#1A1212',
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
      y: 360,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);

    // Step 2: Split the arches apart horizontally (Left half goes left, right half goes right)
    tl.to(leftArchRef.current, { x: -450, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
    tl.to(rightArchRef.current, { x: 450, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 0.1);
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
      <span className="text-[10px] tracking-[0.4em] text-[#1A1212]/45 uppercase mb-3 block font-light">
        {label}
      </span>

      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="focus:outline-none z-10 transition-transform"
        aria-label="Enter Naami Collection"
      >
        {/* Traced from brand.png via pixel-scanline measurement (1080x1350 source) */}
        <svg
          ref={svgRef}
          width="90"
          height="112"
          viewBox="0 0 1080 1350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="will-change-transform"
        >
          {/* LEFT HALF OF OUTER ARCH — foot spur + leg + arc to apex */}
          <path
            ref={leftArchRef}
            d="M380,772 L448,772 M414,760 V425 C414,350 460,310 540,310"
            stroke="#1A1212"
            strokeWidth="26"
            strokeLinecap="round"
            className="will-change-transform"
          />

          {/* RIGHT HALF OF OUTER ARCH — mirrored */}
          <path
            ref={rightArchRef}
            d="M634,772 L702,772 M668,760 V425 C668,350 620,310 540,310"
            stroke="#1A1212"
            strokeWidth="26"
            strokeLinecap="round"
            className="will-change-transform"
          />

          {/* INNER TWIN 'M' VAULTS — humps merging into a shared center bar */}
          <path
            ref={innerMRef}
            d="M426,535 Q450,495 476,505 Q502,515 531,555 V772 M656,535 Q632,495 606,505 Q580,515 551,555 V772"
            stroke="#1A1212"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="will-change-transform"
          />

          {/* TRACED WORDMARK: naami */}
          <g ref={textRef} className="will-change-transform">
            {/* n */}
            <path
              d="M368,1035 V885 C368,860 380,852 386,852 C392,852 404,860 404,885 V1035"
              stroke="#1A1212"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* a */}
            <path
              d="M444,1030 V885 C444,860 456,852 462,852 C468,852 481,860 481,885 V1030 L462,1050 Z"
              stroke="#1A1212"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* a */}
            <path
              d="M521,1030 V885 C521,860 533,852 539,852 C545,852 557,860 557,885 V1030 L539,1050 Z"
              stroke="#1A1212"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* m */}
            <path
              d="M598,1035 V885 C598,860 610,852 616,852 C622,852 635,860 635,885 C635,860 647,852 653,852 C659,852 671,860 671,885 V1035"
              stroke="#1A1212"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* i (stem + dot) */}
            <path
              d="M711,1035 V885 M712,826 L712,827"
              stroke="#1A1212"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </button>

      {/* Portal Overlay mounted directly under document.body */}
      {mounted && createPortal(
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
