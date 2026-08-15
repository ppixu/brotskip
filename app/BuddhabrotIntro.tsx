"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import {
  INTRO_MAX_ITERATIONS,
  INTRO_SAMPLE_BUDGET,
  INTRO_THROW_LIFE_MS,
  INTRO_THROWS_PER_FRAME,
  introThrowToCanvas,
} from "@/lib/buddhabrot/intro-throws";
import type { GpuContext } from "@/lib/gpu";

const FADE_MS = 600;
// Defense in depth: if toBitmapAndBlob() never settles (createImageBitmap
// wedging under memory pressure, a half-lost device), don't strand play.
const COMPLETION_TIMEOUT_MS = 10_000;
const THROW_GROW_MS = 280;

type LiveThrow = {
  points: Array<{ x: number; y: number }>;
  born: number;
};

export default function BuddhabrotIntro({
  gpu, size, reduceMotion, onReady, onDismiss,
}: {
  gpu: GpuContext;
  size: number;
  reduceMotion: boolean;
  onReady: (bitmap: ImageBitmap, blobPromise: Promise<Blob | null>, size: number) => void;
  onDismiss: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const throwsRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { onDismiss(); return; }
    const context = canvas.getContext("webgpu") as any;
    if (!context) {
      onDismiss();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    // Square backing store: the Buddhabrot texture is square, and CSS
    // object-fit: cover crops it to the (possibly non-square) viewport
    // instead of the blit shader stretching it to fit.
    const side = Math.max(1, Math.round(Math.max(rect.width, rect.height) * dpr));
    canvas.width = side;
    canvas.height = side;
    context.configure({ device: gpu.device, format: gpu.preferredFormat, alphaMode: "premultiplied" });

    const throwsCanvas = throwsRef.current;
    const throwsContext = throwsCanvas?.getContext("2d") ?? null;
    if (throwsCanvas) {
      throwsCanvas.width = side;
      throwsCanvas.height = side;
    }

    const generator = createBuddhabrotGenerator(gpu, {
      size,
      totalSamples: INTRO_SAMPLE_BUDGET[size] ?? INTRO_SAMPLE_BUDGET[2048],
      maxIterations: INTRO_MAX_ITERATIONS,
      // Reduced motion opts out of spectacle, so drop the five second floor.
      minDurationMs: reduceMotion ? 0 : undefined,
    });

    let frame = 0;
    let lastTime = performance.now();
    let finished = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    const liveThrows: LiveThrow[] = [];

    function drawThrows(now: number) {
      if (!throwsContext || !throwsCanvas || reduceMotion) return;
      throwsContext.clearRect(0, 0, throwsCanvas.width, throwsCanvas.height);
      throwsContext.lineCap = "round";
      throwsContext.lineJoin = "round";
      for (const trail of liveThrows) {
        const age = now - trail.born;
        if (age > INTRO_THROW_LIFE_MS || trail.points.length < 2) continue;
        const fade = 1 - age / INTRO_THROW_LIFE_MS;
        const grow = Math.min(1, age / THROW_GROW_MS);
        const count = Math.max(2, Math.floor(trail.points.length * grow));
        throwsContext.strokeStyle = `rgba(186, 245, 255, ${0.16 + fade * 0.55})`;
        throwsContext.lineWidth = 1.15;
        throwsContext.beginPath();
        throwsContext.moveTo(trail.points[0].x, trail.points[0].y);
        for (let index = 1; index < count; index++) {
          throwsContext.lineTo(trail.points[index].x, trail.points[index].y);
        }
        throwsContext.stroke();
        const tip = trail.points[count - 1];
        throwsContext.fillStyle = `rgba(255, 255, 255, ${0.28 + fade * 0.7})`;
        throwsContext.beginPath();
        throwsContext.arc(tip.x, tip.y, 1.4 + fade * 1.2, 0, Math.PI * 2);
        throwsContext.fill();
      }
    }

    function spawnThrows(now: number) {
      if (reduceMotion) return;
      for (let index = 0; index < INTRO_THROWS_PER_FRAME; index++) {
        const trail = introThrowToCanvas(Math.random, side);
        if (!trail) continue;
        liveThrows.push({ points: trail.points, born: now });
      }
      while (liveThrows.length && now - liveThrows[0].born > INTRO_THROW_LIFE_MS) {
        liveThrows.shift();
      }
    }

    function loop(now: number) {
      if (gpu.hasFailed()) {
        onDismiss();
        return;
      }
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;
      generator.step(elapsed);
      generator.blit(context);
      spawnThrows(now);
      drawThrows(now);
      setProgress(generator.progress());
      if (generator.isComplete() && !finished) {
        finished = true;
        completionTimer = setTimeout(onDismiss, COMPLETION_TIMEOUT_MS);
        generator.toBitmapAndBlob().then(({ bitmap, blobPromise }) => {
          clearTimeout(completionTimer);
          onReady(bitmap, blobPromise, size);
          setFading(true);
          dismissTimer = setTimeout(onDismiss, FADE_MS);
        }).catch(() => {
          clearTimeout(completionTimer);
          onDismiss();
        });
        return;
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(dismissTimer);
      clearTimeout(completionTimer);
      generator.destroy();
    };
  }, [gpu, size, reduceMotion, onReady, onDismiss]);

  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <canvas ref={canvasRef} className="introCanvas" aria-hidden="true" />
      {reduceMotion ? null : <canvas ref={throwsRef} className="introThrows" aria-hidden="true" />}
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>
      </div>
    </div>
  );
}
