"use client";

import { useEffect, useRef } from "react";
import {
  ESCAPE_SEED,
  EXPLAIN_PARTS,
  ITERATE_SEED,
  STACK_SEEDS,
  TRAPPED_SEED,
  canvasBackingSize,
  escapingOrbit,
  type ExplainPart,
} from "@/lib/buddhabrot/explain";

const HALF = 2.35;
const FILM_HEIGHT = 104;

type Size = { width: number; height: number };

function toScreen(re: number, im: number, size: Size) {
  return {
    x: (re / HALF + 1) * 0.5 * size.width,
    y: (1 - im / HALF) * 0.5 * size.height,
  };
}

function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Size {
  const cssWidth = Math.max(1, canvas.clientWidth);
  const cssHeight = Math.max(1, canvas.clientHeight);
  const backing = canvasBackingSize(cssWidth, cssHeight, window.devicePixelRatio || 1);
  if (canvas.width !== backing.width || canvas.height !== backing.height) {
    canvas.width = backing.width;
    canvas.height = backing.height;
  }
  ctx.setTransform(backing.dpr, 0, 0, backing.dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { width: cssWidth, height: cssHeight };
}

function drawAxes(ctx: CanvasRenderingContext2D, size: Size) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.strokeStyle = "rgba(151, 231, 240, .28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(size.height / 2) + 0.5);
  ctx.lineTo(size.width, Math.round(size.height / 2) + 0.5);
  ctx.moveTo(Math.round(size.width / 2) + 0.5, 0);
  ctx.lineTo(Math.round(size.width / 2) + 0.5, size.height);
  ctx.stroke();
  const radius = size.width * (1 / HALF);
  ctx.strokeStyle = "rgba(186, 230, 238, .42)";
  ctx.beginPath();
  ctx.arc(size.width / 2, size.height / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(186, 230, 238, .72)";
  ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("|z| = 2", 8, 16);
}

function numberedDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  active: boolean,
  fill = "#071014",
  stroke = "#9fe7f0",
) {
  ctx.beginPath();
  ctx.arc(x, y, active ? 8.5 : 7.5, 0, Math.PI * 2);
  ctx.fillStyle = active ? "#dffbff" : fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = active ? "#072026" : "#e7fbff";
  ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  size: Size,
  points: { re: number; im: number }[],
  until: number,
  alpha: number,
  rgb: string,
  radius = 2.2,
) {
  const last = Math.max(0, Math.min(until, points.length));
  if (last <= 0) return;
  ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
  ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, alpha * 1.2)})`;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  const origin = toScreen(0, 0, size);
  ctx.moveTo(origin.x, origin.y);
  for (let index = 0; index < last; index++) {
    const point = toScreen(points[index].re, points[index].im, size);
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  for (let index = 0; index < last; index++) {
    const point = toScreen(points[index].re, points[index].im, size);
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === last - 1 ? radius + 1.1 : radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function HowItWorksFilm({ kind }: { kind: ExplainPart["film"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const iterate = escapingOrbit(ITERATE_SEED, 4);
    const trapped = escapingOrbit(TRAPPED_SEED, 18);
    const escaping = escapingOrbit(ESCAPE_SEED, 16);
    const stacked = STACK_SEEDS.map((seed) => escapingOrbit(seed, 16));
    let size = fitCanvas(canvas, ctx);
    let frame = 0;
    const start = performance.now();

    const observer = new ResizeObserver(() => {
      size = fitCanvas(canvas, ctx);
    });
    observer.observe(canvas);

    function label(text: string, re: number, im: number, color: string, dx = 7, dy = -7) {
      const point = toScreen(re, im, size);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = color;
      ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(text, point.x + dx, point.y + dy);
    }

    function paint(now: number) {
      const elapsed = (now - start) / 1000;
      ctx.fillStyle = "#071014";
      ctx.fillRect(0, 0, size.width, size.height);
      drawAxes(ctx, size);

      if (kind === "iterate") {
        const hopMs = 480;
        const cycle = (iterate.length + 1) * hopMs + 800;
        const shown = reduceMotion
          ? iterate.length
          : Math.min(iterate.length, Math.floor(((elapsed * 1000) % cycle) / hopMs));
        drawPath(ctx, size, iterate, shown, 0.95, "120, 220, 236", 1.6);
        const origin = toScreen(0, 0, size);
        numberedDot(ctx, origin.x, origin.y, "0", shown === 0);
        for (let index = 0; index < shown; index++) {
          const point = toScreen(iterate[index].re, iterate[index].im, size);
          numberedDot(
            ctx,
            point.x,
            point.y,
            String(index + 1),
            index === shown - 1,
            index === 0 ? "#3a2f08" : "#071014",
            index === 0 ? "#ffe46a" : "#9fe7f0",
          );
        }
        label("start", 0, 0, "#fff6c8", 12, 16);
        if (shown > 0) label("splash", iterate[0].re, iterate[0].im, "#ffe46a", 12, 16);
      }

      if (kind === "escape") {
        const hopMs = 280;
        const cycle = escaping.length * hopMs + 900;
        const shown = reduceMotion
          ? escaping.length
          : Math.min(escaping.length, 1 + Math.floor(((elapsed * 1000) % cycle) / hopMs));
        drawPath(ctx, size, trapped, trapped.length, 0.5, "120, 210, 140", 2);
        drawPath(ctx, size, escaping, shown, 0.95, "120, 220, 236", 2.5);
        label("stays", trapped[3].re, trapped[3].im, "rgba(168, 230, 176, .95)", 10, -8);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#dffbff";
        ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("escapes →", size.width - 72, size.height / 2 - 10);
      }

      if (kind === "stack") {
        const reveal = reduceMotion
          ? stacked.length
          : Math.min(stacked.length, 1 + Math.floor((elapsed * 2.2) % (stacked.length + 3)));
        for (let index = 0; index < reveal; index++) {
          const tint = index % 3 === 0 ? "120, 220, 236" : index % 3 === 1 ? "186, 255, 150" : "255, 176, 110";
          drawPath(ctx, size, stacked[index], stacked[index].length, 0.28, tint, 1.35);
        }
      }
    }

    function loop(now: number) {
      paint(now);
      frame = requestAnimationFrame(loop);
    }

    if (reduceMotion) {
      paint(start);
      return () => observer.disconnect();
    }
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [kind]);

  return (
    <canvas
      ref={canvasRef}
      className="howItWorksFilm"
      height={FILM_HEIGHT}
      aria-hidden="true"
    />
  );
}

export default function HowItWorks() {
  return (
    <div className="howItWorks">
      <button type="button" className="howItWorksTrigger" aria-describedby="how-it-works-panel">
        How does this work
      </button>
      <div id="how-it-works-panel" className="howItWorksPanel" role="tooltip">
        <p className="howItWorksKicker">How the picture is made</p>
        {EXPLAIN_PARTS.map((part) => (
          <section key={part.title} className="howItWorksPart">
            <h3>{part.title}</h3>
            <HowItWorksFilm kind={part.film} />
            {part.formula ? <p className="howItWorksFormula">{part.formula}</p> : null}
            <p>{part.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
