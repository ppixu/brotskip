"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import {
  INTRO_PLAY_FOV,
  PLAY_POND_VIEW,
  introPlayAlignT,
  introPlayCamera,
  introPlayFlatten,
  lerpIntroCamera,
  playAlignYaw,
} from "@/lib/intro-play";

const RIPPLE_LIFETIME_MS = 2_800;
const RIPPLE_DELAYS = [0, 260, 520] as const;

type CloudRipple = {
  born: number;
  group: THREE.Group;
  beacon: THREE.Sprite;
  rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[];
};

function makeBeaconTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.14, "rgba(190,235,255,0.98)");
  gradient.addColorStop(0.42, "rgba(80,170,255,0.36)");
  gradient.addColorStop(1, "rgba(20,80,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

type CloudVariant = "henon" | "classic";

export default function BuddhabrotCloudCanvas({
  fading,
  variant = "henon",
}: {
  fading: boolean;
  variant?: CloudVariant;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fadingRef = useRef(fading);
  fadingRef.current = fading;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let previousTime = performance.now();
    let pageVisible = !document.hidden;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030408);
    const camera = new THREE.PerspectiveCamera(INTRO_PLAY_FOV, 1, 0.01, 20);
    const target = new THREE.Vector3(0, 0, 0);
    const classic = variant === "classic";
    let yaw = classic ? 0.16 : 0.72;
    let pitch = classic ? 0.12 : 0.32;
    let distance = classic ? 5.0 : 3.15;
    let alignFrom: { yaw: number; pitch: number; distance: number; target: { x: number; y: number; z: number } } | null = null;
    let alignStarted = 0;
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const spark = new SparkRenderer({
      renderer,
      minPixelRadius: 0.02,
      maxStdDev: 2.15,
      blurAmount: 0,
      falloff: 1,
      sortRadial: true,
    });
    scene.add(spark);

    const assetName = classic ? "true-buddhabrot-4096.spz" : "henon-buddhabrot-4096.spz";
    const assetUrl = new URL(assetName, window.location.href).href;
    const splat = new SplatMesh({ url: assetUrl, lod: false });
    splat.opacity = 0.82;
    scene.add(splat);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || fadingRef.current) return;
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add("dragging");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      yaw -= (event.clientX - lastPointerX) * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastPointerY) * 0.005, -1.25, 1.25);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    };
    const onPointerUp = () => {
      dragging = false;
      renderer.domElement.classList.remove("dragging");
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const rippleGeometry = new THREE.RingGeometry(0.972, 1, 96);
    const beaconTexture = makeBeaconTexture();
    const ripples: CloudRipple[] = [];
    let splatReady = false;
    let nextRippleAt = Number.POSITIVE_INFINITY;

    function removeRipple(ripple: CloudRipple) {
      scene.remove(ripple.group);
      ripple.beacon.material.dispose();
      for (const ring of ripple.rings) ring.material.dispose();
    }

    function pickVisibleSplat() {
      const packed = splat.packedSplats;
      if (!packed) return null;
      const count = packed.getNumSplats();
      let fallback: ReturnType<typeof packed.getSplat> | null = null;
      for (let attempt = 0; attempt < 32; attempt++) {
        const sample = packed.getSplat(Math.floor(Math.random() * count));
        if (sample.opacity < 0.12) continue;
        fallback ??= sample;
        const projected = sample.center.clone().project(camera);
        if (projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.76 && Math.abs(projected.y) < 0.72) {
          return sample;
        }
      }
      return fallback;
    }

    function spawnRipple(now: number) {
      const sample = pickVisibleSplat();
      if (!sample) return;
      const group = new THREE.Group();
      group.position.copy(sample.center);
      group.quaternion.copy(sample.quaternion);

      const rings = RIPPLE_DELAYS.map((_, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: index === 0 ? 0xd8f7ff : 0x65b9ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const ring = new THREE.Mesh(rippleGeometry, material);
        ring.scale.setScalar(0.001);
        group.add(ring);
        return ring;
      });

      const beaconMaterial = new THREE.SpriteMaterial({
        map: beaconTexture,
        color: 0xe8fbff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const beacon = new THREE.Sprite(beaconMaterial);
      beacon.scale.setScalar(0.18);
      group.add(beacon);
      scene.add(group);
      ripples.push({ born: now, group, beacon, rings });
    }

    function updateRipples(now: number) {
      if (splatReady && !reduceMotion && !fadingRef.current && now >= nextRippleAt && ripples.length < 4) {
        spawnRipple(now);
        nextRippleAt = now + 850 + Math.random() * 1_150;
      }
      for (let index = ripples.length - 1; index >= 0; index--) {
        const ripple = ripples[index];
        const elapsed = now - ripple.born;
        const beaconT = Math.min(1, elapsed / 760);
        ripple.beacon.material.opacity = Math.pow(1 - beaconT, 1.7);
        ripple.beacon.scale.setScalar(0.12 + Math.sin(beaconT * Math.PI) * 0.13);
        for (let ringIndex = 0; ringIndex < ripple.rings.length; ringIndex++) {
          const ring = ripple.rings[ringIndex];
          const ringElapsed = elapsed - RIPPLE_DELAYS[ringIndex];
          const t = THREE.MathUtils.clamp(ringElapsed / (RIPPLE_LIFETIME_MS - RIPPLE_DELAYS[ringIndex]), 0, 1);
          ring.visible = ringElapsed >= 0 && t < 1;
          ring.scale.setScalar(0.02 + t * 0.32);
          ring.material.opacity = Math.sin(t * Math.PI) * Math.pow(1 - t, 0.72) * 0.46;
        }
        if (elapsed >= RIPPLE_LIFETIME_MS) {
          removeRipple(ripple);
          ripples.splice(index, 1);
        }
      }
    }

    function resize() {
      const rect = host!.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function render(now: number) {
      frame = 0;
      if (disposed || !pageVisible) return;
      const delta = Math.min(50, now - previousTime);
      previousTime = now;
      if (fadingRef.current) {
        if (!alignFrom) {
          alignFrom = { yaw, pitch, distance, target: { x: target.x, y: target.y, z: target.z } };
          alignStarted = now;
        }
        const alignT = introPlayAlignT(now - alignStarted, reduceMotion);
        const play = introPlayCamera(PLAY_POND_VIEW, playAlignYaw(alignFrom.yaw));
        const pose = lerpIntroCamera(alignFrom, play, alignT);
        yaw = pose.yaw;
        pitch = pose.pitch;
        distance = pose.distance;
        target.set(pose.target.x, pose.target.y, pose.target.z);
        splat.scale.z = introPlayFlatten(alignT);
      } else {
        alignFrom = null;
        splat.scale.z = 1;
        if (!reduceMotion && !dragging) yaw += delta * 0.000055;
      }
      const cosPitch = Math.cos(pitch);
      camera.position.set(
        target.x + Math.sin(yaw) * cosPitch * distance,
        target.y + Math.sin(pitch) * distance,
        target.z + Math.cos(yaw) * cosPitch * distance,
      );
      camera.lookAt(target);
      updateRipples(now);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (!pageVisible) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame && !disposed) {
        previousTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = requestAnimationFrame(render);

    splat.initialized.then(() => {
      if (!disposed) {
        splatReady = true;
        nextRippleAt = performance.now() + 420;
        setReady(true);
      }
    }).catch(() => {
      if (!disposed) setReady(false);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      for (const ripple of ripples) removeRipple(ripple);
      ripples.length = 0;
      rippleGeometry.dispose();
      beaconTexture.dispose();
      scene.remove(splat);
      scene.remove(spark);
      renderer.domElement.remove();

      // Spark can still be awaiting its GPU depth readback when React unmounts.
      // Let that readback finish before its render target is disposed.
      const disposeCloud = () => {
        if (spark.sorting || spark.sortTimeoutId !== -1) {
          window.setTimeout(disposeCloud, 16);
          return;
        }
        splat.dispose();
        spark.dispose();
        renderer.dispose();
      };
      disposeCloud();
    };
  }, [variant]);

  return (
    <div
      ref={hostRef}
      className={`introCloudHost ${ready ? "ready" : ""} ${fading ? "fading" : ""}`}
      role="img"
      aria-label={`${variant === "classic" ? "True z squared plus c" : "Complex Henon"} precomputed 3D Buddhabrot Gaussian cloud. Drag to orbit.`}
    />
  );
}
