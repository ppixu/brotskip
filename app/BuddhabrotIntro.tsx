"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import type { GpuContext } from "@/lib/gpu";

const FADE_MS = 600;
// Defense in depth: if toBitmapAndBlob() never settles (createImageBitmap
// wedging under memory pressure, a half-lost device), don't strand play.
const COMPLETION_TIMEOUT_MS = 10_000;

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

    const generator = createBuddhabrotGenerator(gpu, {
      size,
      // Reduced motion opts out of spectacle, so drop the five second floor.
      minDurationMs: reduceMotion ? 0 : undefined,
    });

    let frame = 0;
    let lastTime = performance.now();
    let finished = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;

    function loop(now: number) {
      if (gpu.hasFailed()) {
        onDismiss();
        return;
      }
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;
      generator.step(elapsed);
      generator.blit(context);
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
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>
      </div>
    </div>
  );
}
