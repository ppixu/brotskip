"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- WebGPU types are not shipped in this browser target. */

import { useEffect, useRef, useState } from "react";
import { createBuddhabrotGenerator } from "@/lib/buddhabrot/generator";
import {
  INTRO_MAX_ITERATIONS,
  INTRO_SAMPLE_BUDGET,
  SACRED_PATH_COUNTS,
  createIntroRockThrow,
  sacredShapeOffset,
  type IntroRockThrow,
} from "@/lib/buddhabrot/intro-throws";
import type { GpuContext } from "@/lib/gpu";

const FADE_MS = 600;
// Defense in depth: if toBitmapAndBlob() never settles (createImageBitmap
// wedging under memory pressure, a half-lost device), don't strand play.
const COMPLETION_TIMEOUT_MS = 10_000;
const THROW_SPAWN_INTERVAL_MS = 680;
const ITERATION_LIFE_MS = 1600;
const RIPPLE_LIFE_MS = 900;
const TRAIL_FADE_MS = 800;

type LiveRockThrow = {
  throwData: IntroRockThrow;
  born: number;
  spinSpeed: number;
  triggeredImpacts: Set<number>;
};

type LiveRipple = {
  x: number;
  y: number;
  born: number;
};

type LiveImpactOrbit = {
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
    let lastThrowSpawn = 0;
    let finished = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;

    let liveThrows: LiveRockThrow[] = [];
    let liveRipples: LiveRipple[] = [];
    let liveImpactOrbits: LiveImpactOrbit[] = [];

    function updatePhysicsAndSpawns(now: number) {
      if (reduceMotion) return;

      // Spawn a new rock throw periodically
      if (now - lastThrowSpawn > THROW_SPAWN_INTERVAL_MS || lastThrowSpawn === 0) {
        const throwData = createIntroRockThrow(side, Math.random);
        const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 8);
        liveThrows.push({
          throwData,
          born: now,
          spinSpeed,
          triggeredImpacts: new Set(),
        });
        lastThrowSpawn = now;
      }

      // Check for impact events along each rock's trajectory
      for (const throwEntry of liveThrows) {
        const flightSec = (now - throwEntry.born) / 1000;
        for (const impact of throwEntry.throwData.impacts) {
          if (flightSec >= impact.t && !throwEntry.triggeredImpacts.has(impact.skipIndex)) {
            throwEntry.triggeredImpacts.add(impact.skipIndex);
            liveRipples.push({ x: impact.x, y: impact.y, born: now });
            if (impact.orbitPoints.length >= 2) {
              liveImpactOrbits.push({ points: impact.orbitPoints, born: now });
            }
          }
        }
      }

      // Cleanup finished objects
      liveThrows = liveThrows.filter((t) => now - t.born < (t.throwData.duration * 1000 + TRAIL_FADE_MS));
      liveRipples = liveRipples.filter((r) => now - r.born < RIPPLE_LIFE_MS);
      liveImpactOrbits = liveImpactOrbits.filter((o) => now - o.born < ITERATION_LIFE_MS);
    }

    function drawThrows(now: number) {
      if (!throwsContext || !throwsCanvas || reduceMotion) return;
      throwsContext.clearRect(0, 0, throwsCanvas.width, throwsCanvas.height);
      throwsContext.lineCap = "round";
      throwsContext.lineJoin = "round";

      // 1. Draw dim iteration lines originating from actual rock skips
      for (const orbit of liveImpactOrbits) {
        const age = now - orbit.born;
        if (age > ITERATION_LIFE_MS || orbit.points.length < 2) continue;
        const fade = 1 - age / ITERATION_LIFE_MS;
        const grow = Math.min(1, age / 320);
        const count = Math.max(2, Math.floor(orbit.points.length * grow));
        const alpha = 0.03 + fade * 0.09;

        throwsContext.strokeStyle = `rgba(135, 220, 250, ${alpha})`;
        throwsContext.lineWidth = 0.95;
        throwsContext.beginPath();
        throwsContext.moveTo(orbit.points[0].x, orbit.points[0].y);
        for (let i = 1; i < count; i++) {
          throwsContext.lineTo(orbit.points[i].x, orbit.points[i].y);
        }
        throwsContext.stroke();
      }

      // 2. Draw expanding water ripples from rock skips
      for (const ripple of liveRipples) {
        const age = (now - ripple.born) / 1000;
        if (age > RIPPLE_LIFE_MS / 1000) continue;
        for (let ring = 0; ring < 2; ring++) {
          const rt = Math.max(0, age - ring * 0.12);
          const radius = 4 + rt * 34;
          const alpha = Math.max(0, (0.50 - rt * 0.58) * 0.85);
          throwsContext.strokeStyle = `rgba(151, 241, 255, ${alpha})`;
          throwsContext.lineWidth = 1;
          throwsContext.beginPath();
          throwsContext.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
          throwsContext.stroke();
        }
      }

      // 3. Draw rock trajectories (more visible dashed/glowing lines) and the flying rocks
      for (const throwEntry of liveThrows) {
        const flightSec = (now - throwEntry.born) / 1000;
        const duration = throwEntry.throwData.duration;
        const pts = throwEntry.throwData.trajectory;
        if (!pts.length) continue;

        const trailFade = flightSec <= duration
          ? 1
          : Math.max(0, 1 - (flightSec - duration) / (TRAIL_FADE_MS / 1000));

        // Draw the full trajectory arc (dashed line signifying flight path)
        throwsContext.save();
        throwsContext.strokeStyle = `rgba(205, 245, 255, ${0.44 * trailFade})`;
        throwsContext.lineWidth = 1.35;
        throwsContext.setLineDash([5, 6]);
        throwsContext.beginPath();
        throwsContext.moveTo(pts[0].x, pts[0].y - pts[0].z * 0.30);
        for (let i = 1; i < pts.length; i++) {
          throwsContext.lineTo(pts[i].x, pts[i].y - pts[i].z * 0.30);
        }
        throwsContext.stroke();
        throwsContext.setLineDash([]);
        throwsContext.restore();

        // If rock is currently in flight, draw its wake, shadow, and rotating glyph
        if (flightSec <= duration) {
          // Find current position along trajectory
          let currentIdx = 0;
          while (currentIdx < pts.length - 1 && pts[currentIdx + 1].t <= flightSec) {
            currentIdx++;
          }

          const p0 = pts[currentIdx];
          const p1 = pts[Math.min(currentIdx + 1, pts.length - 1)];
          const span = p1.t - p0.t;
          const fraction = span > 0 ? Math.min(1, Math.max(0, (flightSec - p0.t) / span)) : 0;

          const rockX = p0.x + (p1.x - p0.x) * fraction;
          const rockY = p0.y + (p1.y - p0.y) * fraction;
          const rockZ = p0.z + (p1.z - p0.z) * fraction;

          // Draw trailing wake
          const wakeStart = Math.max(0, currentIdx - 8);
          if (currentIdx > wakeStart) {
            throwsContext.save();
            throwsContext.strokeStyle = "rgba(255, 255, 255, 0.70)";
            throwsContext.lineWidth = 1.6;
            throwsContext.beginPath();
            throwsContext.moveTo(pts[wakeStart].x, pts[wakeStart].y - pts[wakeStart].z * 0.30);
            for (let i = wakeStart + 1; i <= currentIdx; i++) {
              throwsContext.lineTo(pts[i].x, pts[i].y - pts[i].z * 0.30);
            }
            throwsContext.lineTo(rockX, rockY - rockZ * 0.30);
            throwsContext.stroke();
            throwsContext.restore();
          }

          // Draw ground shadow on water surface
          const heightRatio = Math.min(1, rockZ / (side * 0.40));
          const shadowAlpha = 0.36 * (1 - heightRatio * 0.75);
          throwsContext.fillStyle = `rgba(0, 4, 9, ${shadowAlpha})`;
          throwsContext.beginPath();
          throwsContext.ellipse(rockX, rockY, 8.5, 3.2, 0, 0, Math.PI * 2);
          throwsContext.fill();

          // Draw elevated spinning rock glyph
          const lift = rockZ * 0.30;
          const drawY = rockY - lift;
          const spinAngle = flightSec * throwEntry.spinSpeed;
          const shape = throwEntry.throwData.shape;
          const shapePaths = SACRED_PATH_COUNTS[shape % SACRED_PATH_COUNTS.length];
          const rockRadius = 8.5;

          throwsContext.save();
          throwsContext.translate(rockX, drawY);
          throwsContext.rotate(spinAngle);
          throwsContext.strokeStyle = "rgba(255, 255, 255, 0.88)";
          throwsContext.lineWidth = 1.15;

          for (let path = 0; path < shapePaths; path++) {
            throwsContext.beginPath();
            for (let s = 0; s <= 32; s++) {
              const offset = sacredShapeOffset(shape, path, s / 32);
              if (s === 0) throwsContext.moveTo(offset.x * rockRadius, offset.y * rockRadius);
              else throwsContext.lineTo(offset.x * rockRadius, offset.y * rockRadius);
            }
            throwsContext.stroke();
          }

          // Inner preview dots
          throwsContext.fillStyle = "#ffffff";
          const dotCount = 6;
          for (let i = 0; i < dotCount; i++) {
            const path = i % shapePaths;
            const pathIndex = Math.floor(i / shapePaths);
            const samplesOnPath = Math.ceil((dotCount - path) / shapePaths);
            const offset = sacredShapeOffset(shape, path, pathIndex / Math.max(samplesOnPath, 1));
            throwsContext.beginPath();
            throwsContext.arc(offset.x * rockRadius, offset.y * rockRadius, 1.05, 0, Math.PI * 2);
            throwsContext.fill();
          }
          throwsContext.restore();
        }
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
      updatePhysicsAndSpawns(now);
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

