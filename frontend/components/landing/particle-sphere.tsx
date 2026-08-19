"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  z: number;
  kind: number;
};

function makeParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    particles.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      kind: i % 8,
    });
  }
  return particles;
}

export function ParticleSphere({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = makeParticles(1600);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let rotation = 0.4;
    const tilt = 0.35;

    const resize = () => {
      const size = Math.min(canvas.clientWidth, canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const size = Math.min(canvas.clientWidth, canvas.clientHeight);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const scale = size * 0.42;
      const dark = document.documentElement.classList.contains("dark");
      const rgb = dark ? "255,255,255" : "17,17,17";

      const cosY = Math.cos(rotation);
      const sinY = Math.sin(rotation);
      const cosX = Math.cos(tilt);
      const sinX = Math.sin(tilt);

      for (const p of particles) {
        const xz = p.x * cosY - p.z * sinY;
        const zz = p.x * sinY + p.z * cosY;
        const yz = p.y * cosX - zz * sinX;
        const z = p.y * sinX + zz * cosX;
        const depth = (z + 1.2) / 2.2;
        const px = cx + xz * scale;
        const py = cy + yz * scale;
        const alpha = 0.12 + depth * 0.45;
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.lineWidth = 1;

        if (p.kind === 0 || p.kind === 4) {
          ctx.beginPath();
          ctx.arc(px, py, 0.7 + depth * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 1 || p.kind === 5) {
          ctx.beginPath();
          ctx.moveTo(px - 2.4, py);
          ctx.lineTo(px + 2.4, py);
          ctx.stroke();
        } else if (p.kind === 2) {
          ctx.beginPath();
          ctx.moveTo(px, py - 2.2);
          ctx.lineTo(px, py + 2.2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(px - 1.6, py);
          ctx.lineTo(px + 1.6, py);
          ctx.moveTo(px, py - 1.6);
          ctx.lineTo(px, py + 1.6);
          ctx.stroke();
        }
      }

      if (!reduced) {
        rotation += 0.0018;
        raf = requestAnimationFrame(draw);
      }
    };

    const onResize = () => {
      resize();
      if (reduced) draw();
    };

    const themeObserver = new MutationObserver(() => {
      if (reduced) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    resize();
    draw();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      aria-hidden
    />
  );
}
