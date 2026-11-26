"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { curveThrough, wellShift } from "./lens";

export interface Wake {
  x: number;
  y: number;
  heat: number;
}

export interface SkyLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strong: boolean;
}

export interface Burst {
  x: number;
  y: number;
  at: number;
}

export interface SkyScene {
  width: number;
  height: number;
  portrait: boolean;
  lens: boolean;
  reduced: boolean;
  wakes: Wake[];
  constellation: { x: number; y: number }[];
  links: SkyLink[];
  beam: number | null;
}

type Particle = { x: number; y: number; vx: number; vy: number };

/** 星场背后的一层画布：彗尾、星座、引力尘埃、回放冲击波。几何每帧从 ref 里读，避免鼠标一动就重开动画。 */
export function SkyWell({
  scene,
  pointerRef,
  burstRef,
}: {
  scene: SkyScene;
  pointerRef: RefObject<{ x: number; y: number } | null>;
  burstRef: RefObject<Burst[]>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  useLayoutEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;
    let last = performance.now();
    let sized = "";
    let warped = false;
    const particles: Particle[] = [];

    const ensure = (w: number, h: number, count: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
      if (key !== sized) {
        sized = key;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      while (particles.length < count) particles.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0 });
      if (particles.length > count) particles.length = count;
    };

    const respawn = (p: Particle, w: number, h: number) => {
      const edge = Math.random();
      if (edge < 0.25) {
        p.x = 0;
        p.y = Math.random() * h;
      } else if (edge < 0.5) {
        p.x = w;
        p.y = Math.random() * h;
      } else if (edge < 0.75) {
        p.x = Math.random() * w;
        p.y = 0;
      } else {
        p.x = Math.random() * w;
        p.y = h;
      }
      p.vx = 0;
      p.vy = 0;
    };

    const paint = (now: number) => {
      const scene = sceneRef.current;
      const w = scene?.width ?? 0;
      const h = scene?.height ?? 0;
      if (!scene || w < 2 || h < 2) return;
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const liveLens = scene.lens && !scene.reduced;
      ensure(w, h, liveLens ? (w < 720 ? 72 : 128) : 0);

      const fg = getComputedStyle(canvas).color || "#f4f4f5";
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = fg;

      const pastX = scene.portrait ? 0 : -1;
      const pastY = scene.portrait ? -1 : 0;
      for (const wake of scene.wakes) {
        const len = 28 + wake.heat * 120;
        const x2 = wake.x + pastX * len;
        const y2 = wake.y + pastY * len;
        const gradient = ctx.createLinearGradient(wake.x, wake.y, x2, y2);
        gradient.addColorStop(0, fg);
        gradient.addColorStop(1, "transparent");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.14 + wake.heat * 0.12;
        ctx.beginPath();
        ctx.moveTo(wake.x, wake.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.55 + wake.heat * 0.35;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (scene.constellation.length >= 2) {
        const path = new Path2D(curveThrough(scene.constellation));
        ctx.save();
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.62;
        ctx.lineWidth = 1.35;
        ctx.shadowColor = fg;
        ctx.shadowBlur = scene.reduced ? 0 : 16;
        if (!scene.reduced) {
          ctx.setLineDash([1.5, 7]);
          ctx.lineDashOffset = -((now / 32) % 90);
        }
        ctx.stroke(path);
        ctx.restore();
      }

      for (const seg of scene.links) {
        const mx = (seg.x1 + seg.x2) / 2 + (seg.y2 - seg.y1) * 0.12;
        const my = (seg.y1 + seg.y2) / 2 - (seg.x2 - seg.x1) * 0.12;
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1;
        ctx.globalAlpha = seg.strong ? 0.42 : 0.26;
        ctx.setLineDash(seg.strong ? [] : [3, 5]);
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.quadraticCurveTo(mx, my, seg.x2, seg.y2);
        ctx.stroke();
        if (!scene.reduced) {
          const u = ((now / 1200) + (seg.strong ? 0 : 0.45)) % 1;
          const a = 1 - u;
          const x = a * a * seg.x1 + 2 * a * u * mx + u * u * seg.x2;
          const y = a * a * seg.y1 + 2 * a * u * my + u * u * seg.y2;
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.arc(x, y, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (scene.beam !== null) {
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.38;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (scene.portrait) {
          ctx.moveTo(24, scene.beam);
          ctx.lineTo(w - 24, scene.beam);
        } else {
          ctx.moveTo(scene.beam, 40);
          ctx.lineTo(scene.beam, h - 28);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (!scene.reduced) {
        const bursts = burstRef.current;
        for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].at > 980) bursts.splice(i, 1);
        for (const burst of bursts) {
          const p = (now - burst.at) / 980;
          ctx.strokeStyle = fg;
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = (1 - p) * 0.8;
          ctx.beginPath();
          ctx.arc(burst.x, burst.y, 8 + p * 76, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = (1 - p) * 0.35;
          ctx.beginPath();
          ctx.arc(burst.x, burst.y, 8 + Math.max(0, p - 0.12) * 118, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      const pointer = pointerRef.current;
      const parent = canvas.parentElement;
      if (liveLens && parent) {
        for (const node of parent.querySelectorAll<HTMLElement>("[data-warp]")) {
          const x = Number(node.dataset.x);
          const y = Number(node.dataset.y);
          if (!pointer || Number.isNaN(x) || Number.isNaN(y)) {
            node.style.translate = "";
            continue;
          }
          const shift = wellShift(x - pointer.x, y - pointer.y, 240, 32, Number(node.dataset.r) || 0);
          if (shift.x === 0 && shift.y === 0) {
            node.style.translate = "";
            continue;
          }
          // Tailwind 的 -translate-* 写在 translate 属性上，不能再叠一层 transform。
          node.style.translate = node.dataset.center
            ? `calc(-50% + ${shift.x.toFixed(2)}px) calc(-50% + ${shift.y.toFixed(2)}px)`
            : `${shift.x.toFixed(2)}px ${shift.y.toFixed(2)}px`;
        }
        warped = true;

        for (const particle of particles) {
          particle.vx += Math.sin(now * 0.00035 + particle.y * 0.012) * 26 * dt;
          particle.vy += Math.cos(now * 0.00028 + particle.x * 0.012) * 26 * dt;
          if (pointer) {
            const dx = pointer.x - particle.x;
            const dy = pointer.y - particle.y;
            const r2 = dx * dx + dy * dy + 1600;
            const r = Math.sqrt(r2);
            const pull = 2_600_000 / r2;
            particle.vx += (dx / r) * pull * dt;
            particle.vy += (dy / r) * pull * dt;
            particle.vx += (-dy / r) * pull * 0.85 * dt;
            particle.vy += (dx / r) * pull * 0.85 * dt;
            if (Math.hypot(dx, dy) < 10) respawn(particle, w, h);
          }
          particle.vx *= 0.986;
          particle.vy *= 0.986;
          const speed = Math.hypot(particle.vx, particle.vy);
          if (speed > 320) {
            particle.vx = (particle.vx / speed) * 320;
            particle.vy = (particle.vy / speed) * 320;
          }
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          if (particle.x < -30 || particle.y < -30 || particle.x > w + 30 || particle.y > h + 30) respawn(particle, w, h);
        }

        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        for (const particle of particles) {
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - particle.vx * 0.05, particle.y - particle.vy * 0.05);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (pointer) {
          ctx.strokeStyle = fg;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, 16, 0, Math.PI * 2);
          ctx.moveTo(pointer.x - 7, pointer.y);
          ctx.lineTo(pointer.x + 7, pointer.y);
          ctx.moveTo(pointer.x, pointer.y - 7);
          ctx.lineTo(pointer.x, pointer.y + 7);
          ctx.stroke();
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, 48, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (warped && parent) {
        for (const node of parent.querySelectorAll<HTMLElement>("[data-warp]")) node.style.translate = "";
        warped = false;
      }
    };

    const frame = (now: number) => {
      if (stopped) return;
      paint(now);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      const parent = canvas.parentElement;
      if (parent) for (const node of parent.querySelectorAll<HTMLElement>("[data-warp]")) node.style.translate = "";
    };
  }, [burstRef, pointerRef]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full text-fg" />;
}
