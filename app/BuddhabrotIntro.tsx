"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import type { GpuContext } from "@/lib/gpu";

const FADE_MS = 600;

export default function BuddhabrotIntro({
  gpu, size, reduceMotion, onReady, onDismiss,
}: {
  gpu: GpuContext;
  size: number;
  reduceMotion: boolean;
  onReady: (bitmap: ImageBitmap, blob: Blob | null) => void;
  onDismiss: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("webgpu") as any;
    if (!context) {
      onDismiss();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
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

    function loop(now: number) {
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;
      generator.step(elapsed);
      generator.blit(context);
      setProgress(generator.progress());
      if (generator.isComplete() && !finished) {
        finished = true;
        generator.toBitmapAndBlob().then(({ bitmap, blob }) => {
          onReady(bitmap, blob);
          setFading(true);
          dismissTimer = setTimeout(onDismiss, FADE_MS);
        }).catch(() => onDismiss());
        return;
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(dismissTimer);
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
