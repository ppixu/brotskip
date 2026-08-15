"use client";

import { useEffect, useRef } from "react";
import { DEMO_SEEDS, escapingOrbit } from "@/lib/buddhabrot/explain";

const WIDTH = 288;
const HEIGHT = 148;
const HALF = 1.85;

function toScreen(re: number, im: number) {
  return {
    x: (re / HALF + 1) * 0.5 * WIDTH,
    y: (1 - im / HALF) * 0.5 * HEIGHT,
  };
}

function HowItWorksFilm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orbits = DEMO_SEEDS.map((seed) => escapingOrbit(seed, 24));
    const primary = orbits[0];
    let frame = 0;
    let start = performance.now();

    function drawAxes() {
      ctx.strokeStyle = "rgba(151, 231, 240, .18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      const radius = WIDTH * (1 / HALF);
      ctx.strokeStyle = "rgba(120, 190, 200, .22)";
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawPath(points: typeof primary, until: number, alpha: number, rgb: string) {
      ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fillStyle = `rgba(${rgb}, ${alpha * 1.15})`;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      const origin = toScreen(0, 0);
      ctx.moveTo(origin.x, origin.y);
      for (let index = 0; index < until; index++) {
        const point = toScreen(points[index].re, points[index].im);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
      for (let index = 0; index < until; index++) {
        const point = toScreen(points[index].re, points[index].im);
        ctx.beginPath();
        ctx.arc(point.x, point.y, index === until - 1 ? 3.2 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function paint(now: number) {
      const elapsed = (now - start) / 1000;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(4, 10, 12, .55)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawAxes();

      if (reduceMotion) {
        drawPath(primary, primary.length, 0.72, "120, 220, 236");
      } else {
        const hopMs = 280;
        const cycle = primary.length * hopMs + 900;
        const t = elapsed * 1000 % cycle;
        const shown = Math.min(primary.length, 1 + Math.floor(t / hopMs));
        drawPath(orbits[2], orbits[2].length, 0.16, "186, 255, 120");
        drawPath(orbits[1], orbits[1].length, 0.18, "255, 168, 92");
        drawPath(primary, shown, 0.78, "120, 220, 236");
      }

      const seed = toScreen(DEMO_SEEDS[0].re, DEMO_SEEDS[0].im);
      ctx.fillStyle = "#dffbff";
      ctx.font = "700 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("c", seed.x + 6, seed.y - 6);
      ctx.fillStyle = "rgba(255, 230, 110, .95)";
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(171, 230, 238, .55)";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("0", WIDTH / 2 + 6, HEIGHT / 2 - 6);
      ctx.fillText("|z| = 2", 12, 16);
    }

    function loop(now: number) {
      paint(now);
      frame = requestAnimationFrame(loop);
    }

    if (reduceMotion) {
      paint(start);
      return;
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="howItWorksFilm"
      width={WIDTH}
      height={HEIGHT}
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
        <p className="howItWorksKicker">Buddhabrot</p>
        <HowItWorksFilm />
        <p>Each splash is a complex number <i>c</i>. Start at <i>z</i> = 0 and repeat <i>z → z² + c</i>.</p>
        <p>If the path flies past |z| = 2, paint every stop it visited. The nebula is thousands of those escaping paths stacked together. Paths that never leave are the Mandelbrot set — they stay dark.</p>
      </div>
    </div>
  );
}
