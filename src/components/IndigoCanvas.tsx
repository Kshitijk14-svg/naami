"use client";

import React, { useEffect, useRef } from "react";

interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  life: number;
}

export default function IndigoCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<InkParticle[]>([]);
  const mouse = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse movement tracker
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      const dx = mouse.current.x - mouse.current.lastX;
      const dy = mouse.current.y - mouse.current.lastY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Spawn droplet if moved fast enough to prevent clog
      if (speed > 8 && particles.current.length < 40) {
        particles.current.push({
          x: mouse.current.x,
          y: mouse.current.y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3 - 0.2, // subtle upward drift
          radius: Math.random() * 8 + 12,
          maxRadius: Math.random() * 40 + 70,
          opacity: 0.14,
          life: 1.0,
        });
      }

      mouse.current.lastX = mouse.current.x;
      mouse.current.lastY = mouse.current.y;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Animation Loop
    let rafId: number;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update ink particles
      particles.current = particles.current.filter((p) => {
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.radius += (p.maxRadius - p.radius) * 0.02; // slow expansion
        p.opacity -= 0.0022; // slow fade
        p.life -= 0.0022;

        if (p.opacity <= 0 || p.life <= 0) {
          return false;
        }

        // Draw radial bleed
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(26, 43, 76, ${p.opacity})`); // deep indigo dye
        grad.addColorStop(0.3, `rgba(26, 43, 76, ${p.opacity * 0.4})`);
        grad.addColorStop(1, "rgba(26, 43, 76, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none select-none"
      style={{
        zIndex: 1, // behind content, above default body BG
        filter: "blur(12px)", // makes circles look organic and fluid
        mixBlendMode: "multiply", // blends beautifully with cream parchment
        opacity: 0.85,
      }}
    />
  );
}
