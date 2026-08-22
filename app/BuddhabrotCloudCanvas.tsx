"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PackedSplats, SparkRenderer, SplatMesh, dyno } from "@sparkjsdev/spark";
import {
  INTRO_PLAY_FOV,
  INTRO_START_DISTANCE,
  introPlayFlatten,
  introPlayPose,
  resolveIntroPlayTune,
  type IntroPlayTune,
} from "@/lib/intro-play";
import { compactSplatAt, decodeCompactCloud, type CompactCloud, type CompactSplat } from "@/lib/splat-cloud";
import { pickRegion, SPLAT_REGIONS, type SplatRegion } from "@/lib/splat-regions";

const RIPPLE_LIFETIME_MS = 2_800;
const RIPPLE_DELAYS = [0] as const;

type CloudRipple = {
  born: number;
  group: THREE.Group;
  beacon: THREE.Sprite;
  rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[];
};

const ORBIT_C_REAL = [-2.12, 0.72] as const;
const ORBIT_C_IMAG = [-1.42, 1.42] as const;
const ORBIT_MAX_POINTS = 96;
const COMET_TRAVEL_MS = 9_500;
const COMET_HOLD_MS = 3_200;
const COMET_FADE_MS = 1_900;
const COMET_MAX_COUNT = 4;

type OrbitComet = {
  born: number;
  count: number;
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
};

/**
 * Real z → z² + c escape trajectories, projected exactly like the splat
 * generator's project_orbit(): x = im(z), y = -(re(z) + ½), depth = im(c),
 * over the ±ORBIT_FIELD field the .spz cloud was voxelised into — so every
 * comet path lies along the cloud's own density structure.
 */
function sampleOrbitPath(): { cim: number; re: number[]; im: number[] } | null {
  for (let attempt = 0; attempt < 96; attempt++) {
    const cre = ORBIT_C_REAL[0] + Math.random() * (ORBIT_C_REAL[1] - ORBIT_C_REAL[0]);
    const cim = ORBIT_C_IMAG[0] + Math.random() * (ORBIT_C_IMAG[1] - ORBIT_C_IMAG[0]);
    let zr = 0;
    let zi = 0;
    let escaped = false;
    const re: number[] = [];
    const im: number[] = [];
    for (let step = 0; step < 240; step++) {
      const nr = zr * zr - zi * zi + cre;
      const ni = 2 * zr * zi + cim;
      zr = nr;
      zi = ni;
      if (zr * zr + zi * zi > 16) {
        escaped = true;
        break;
      }
      if (step >= 2) {
        re.push(zr);
        im.push(zi);
      }
    }
    if (escaped && re.length >= 12) {
      return { cim, re: re.slice(0, ORBIT_MAX_POINTS), im: im.slice(0, ORBIT_MAX_POINTS) };
    }
  }
  return null;
}

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

/** Fetch + gunzip + decode the compact cloud, reporting download progress. */
async function loadCompactCloud(url: string, onProgress?: (progress: number) => void): Promise<CompactCloud> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`compact cloud fetch failed: ${response.status}`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress?.(Math.min(1, received / total));
  }
  const raw = new Uint8Array(await new Blob(chunks).arrayBuffer());
  // A proxy may already have transparently gunzipped the response.
  const isRaw = raw.length >= 4 && raw[0] === 0x42 && raw[1] === 0x42 && raw[2] === 0x50 && raw[3] === 0x31;
  if (isRaw) return decodeCompactCloud(raw);
  const inflated = await new Response(
    new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
  return decodeCompactCloud(new Uint8Array(inflated));
}

function packCompactCloud(cloud: CompactCloud): PackedSplats {
  return new PackedSplats({
    maxSplats: cloud.count,
    construct: (splats) => {
      const center = new THREE.Vector3();
      const scales = new THREE.Vector3(cloud.sigma, cloud.sigma, cloud.sigma);
      const quaternion = new THREE.Quaternion();
      const color = new THREE.Color();
      const out: CompactSplat = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, alpha: 0 };
      for (let index = 0; index < cloud.count; index++) {
        compactSplatAt(cloud, index, out);
        center.set(out.x, out.y, out.z);
        color.setRGB(out.r, out.g, out.b);
        splats.pushSplat(center, scales, quaternion, out.alpha, color);
      }
    },
  });
}

export default function BuddhabrotCloudCanvas({
  fading, onLoadProgress, onReady,
  variant = "henon",
  legacySplat = false,
  onRegionChange,
  tune,
}: {
  fading: boolean;
  onLoadProgress?: (progress: number) => void;
  onReady?: () => void;
  variant?: CloudVariant;
  legacySplat?: boolean;
  onRegionChange?: (region: SplatRegion | null) => void;
  tune?: Partial<IntroPlayTune>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fadingRef = useRef(fading);
  const tuneRef = useRef(resolveIntroPlayTune(tune));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fadingRef.current = fading;
  }, [fading]);

  useEffect(() => {
    tuneRef.current = resolveIntroPlayTune(tune);
  }, [tune]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let previousTime = performance.now();
    let pageVisible = !document.hidden;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calibrateRegions = new URLSearchParams(window.location.search).has("regions");

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x030408, 1);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030408);
    const camera = new THREE.PerspectiveCamera(INTRO_PLAY_FOV, 1, 0.05, 120);
    const target = new THREE.Vector3(0, 0, 0);
    const classic = variant === "classic";
    let yaw = classic ? 0.16 : 0.72;
    let pitch = classic ? 0.12 : 0.32;
    let distance = classic ? INTRO_START_DISTANCE.classic : INTRO_START_DISTANCE.henon;
    let alignFrom: {
      yaw: number;
      pitch: number;
      distance: number;
      fov: number;
      target: { x: number; y: number; z: number };
    } | null = null;
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

    const useCompact = classic && !legacySplat;
    const assetName = classic ? "true-buddhabrot-4096.spz" : "henon-buddhabrot-4096.spz";
    const compactName = "true-buddhabrot-450k.bbp.gz";
    let splat: SplatMesh | null = null;

    const splatSize = dyno.dynoFloat(tuneRef.current.splatSize);
    const regionCenter = dyno.dynoVec3(new THREE.Vector3(0, 0, 0));
    const regionInvRadii = dyno.dynoVec3(new THREE.Vector3(1, 1, 1));
    const regionStrength = dyno.dynoFloat(0);
    const splatSizeModifier = dyno.dynoBlock(
      { gsplat: dyno.Gsplat },
      { gsplat: dyno.Gsplat },
      ({ gsplat }) => {
        if (!gsplat) throw new Error("No gsplat input");
        const { scales, center, rgb } = dyno.splitGsplat(gsplat).outputs;
        const offset = dyno.mul(dyno.sub(center, regionCenter), regionInvRadii);
        const inside = dyno.smoothstep(
          dyno.dynoLiteral("float", "1.1"),
          dyno.dynoLiteral("float", "0.75"),
          dyno.length(offset),
        );
        const gain = dyno.add(
          dyno.sub(dyno.dynoLiteral("float", "1.0"), dyno.mul(regionStrength, dyno.dynoLiteral("float", "0.18"))),
          dyno.mul(dyno.mul(regionStrength, inside), dyno.dynoLiteral("float", "1.38")),
        );
        return {
          gsplat: dyno.combineGsplat({
            gsplat,
            scales: dyno.mul(scales, splatSize),
            rgb: dyno.mul(rgb, gain),
          }),
        };
      },
    );

    async function createSplatMesh(): Promise<SplatMesh> {
      if (useCompact) {
        const url = new URL(compactName, window.location.href).href;
        const cloud = await loadCompactCloud(url, onLoadProgress);
        return new SplatMesh({ packedSplats: packCompactCloud(cloud), objectModifier: splatSizeModifier });
      }
      const url = new URL(assetName, window.location.href).href;
      return new SplatMesh({
        url,
        lod: false,
        objectModifier: splatSizeModifier,
        onProgress: (event) => {
          if (event.lengthComputable && event.total > 0) {
            onLoadProgress?.(THREE.MathUtils.clamp(event.loaded / event.total, 0, 1));
          }
        },
      });
    }

    createSplatMesh().then((mesh) => {
      if (disposed) {
        mesh.dispose();
        return;
      }
      mesh.opacity = 0.82;
      splat = mesh;
      scene.add(mesh);
      if (calibrateRegions) {
        for (const region of SPLAT_REGIONS) {
          const wire = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x65b9ff, wireframe: true, transparent: true, opacity: 0.22 }),
          );
          wire.position.set(region.center[0], region.center[1], region.center[2]);
          wire.scale.set(region.radii[0], region.radii[1], region.radii[2]);
          scene.add(wire);
        }
      }
      return mesh.initialized;
    }).then((mesh) => {
      if (!mesh || disposed) return;
      splatReady = true;
      nextRippleAt = performance.now() + 420;
      nextCometAt = performance.now() + 900;
      onLoadProgress?.(1);
      onReady?.();
      setReady(true);
    }).catch(() => {
      if (!disposed) setReady(false);
    });

    const pointerNdc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let hoveredRegion: SplatRegion | null = null;
    // Stamped on every pointer event; read by the idle tour below.
    let lastInteraction = performance.now();

    const IDLE_TOUR_AFTER_MS = 9_000;
    const TOUR_DWELL_MS = 6_000;
    let tourIndex = -1;
    let tourActive = false;
    let tourOwnsHover = false;
    let nextTourStepAt = 0;
    const tourPosition = new THREE.Vector3();
    const tourQuaternion = new THREE.Quaternion();

    function stopTour() {
      if (!tourActive) return;
      tourActive = false;
      if (tourOwnsHover) setHoveredRegion(null);
    }

    function updateTour(now: number) {
      if (reduceMotion || fadingRef.current || !splatReady || dragging) {
        stopTour();
        return;
      }
      if (now - lastInteraction < IDLE_TOUR_AFTER_MS) {
        stopTour();
        return;
      }
      if (tourActive && now < nextTourStepAt) return;
      tourActive = true;
      nextTourStepAt = now + TOUR_DWELL_MS;
      tourIndex = (tourIndex + 1) % SPLAT_REGIONS.length;
      const region = SPLAT_REGIONS[tourIndex];
      setHoveredRegion(region, true);
      tourPosition.set(region.center[0], region.center[1], region.center[2]);
      spawnRippleAt(now, tourPosition, tourQuaternion.identity());
    }

    function setHoveredRegion(region: SplatRegion | null, fromTour = false) {
      tourOwnsHover = fromTour && region !== null;
      if (region === hoveredRegion) return;
      hoveredRegion = region;
      if (region) {
        regionCenter.value.set(region.center[0], region.center[1], region.center[2]);
        regionInvRadii.value.set(1 / region.radii[0], 1 / region.radii[1], 1 / region.radii[2]);
      }
      renderer.domElement.classList.toggle("regionHover", region !== null);
      onRegionChange?.(region);
    }

    function pickAtPointer(event: PointerEvent): SplatRegion | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const picked = pickRegion(raycaster.ray.origin, raycaster.ray.direction, SPLAT_REGIONS);
      return picked ? picked.region : null;
    }

    let pressX = 0;
    let pressY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || fadingRef.current) return;
      dragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      pressX = event.clientX;
      pressY = event.clientY;
      lastInteraction = performance.now();
      setHoveredRegion(null);
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add("dragging");
    };
    const onPointerMove = (event: PointerEvent) => {
      lastInteraction = performance.now();
      if (dragging) {
        yaw -= (event.clientX - lastPointerX) * 0.006;
        pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastPointerY) * 0.005, -1.25, 1.25);
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        return;
      }
      if (fadingRef.current || !splatReady || event.pointerType === "touch") return;
      setHoveredRegion(pickAtPointer(event));
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.classList.remove("dragging");
      lastInteraction = performance.now();
      if (calibrateRegions && Math.hypot(event.clientX - pressX, event.clientY - pressY) <= 5) {
        const packed = splat?.packedSplats;
        if (packed) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointerNdc.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(pointerNdc, camera);
          const { origin, direction } = raycaster.ray;
          const count = packed.getNumSplats();
          let best: { point: THREE.Vector3; score: number } | null = null;
          const toSplat = new THREE.Vector3();
          for (let index = 0; index < count; index += 7) {
            const sample = packed.getSplat(index);
            if (sample.opacity < 0.12) continue;
            toSplat.copy(sample.center).sub(origin);
            const along = toSplat.dot(direction);
            if (along <= 0) continue;
            const offAxis = toSplat.addScaledVector(direction, -along).length();
            const score = offAxis + along * 0.01;
            if (offAxis < 0.06 && (!best || score < best.score)) {
              best = { point: sample.center.clone(), score };
            }
          }
          if (best) {
            console.log(`[regions] splat-space hit: [${best.point.x.toFixed(3)}, ${best.point.y.toFixed(3)}, ${best.point.z.toFixed(3)}]`);
          }
        }
      }
      if (fadingRef.current || !splatReady || event.pointerType !== "touch") return;
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 5) return;
      const tapped = pickAtPointer(event);
      setHoveredRegion(tapped === hoveredRegion ? null : tapped);
    };
    const onPointerLeave = () => setHoveredRegion(null);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const rippleGeometry = new THREE.RingGeometry(0.972, 1, 96);
    const beaconTexture = makeBeaconTexture();
    const ripples: CloudRipple[] = [];
    let splatReady = false;
    let nextRippleAt = Number.POSITIVE_INFINITY;
    const comets: OrbitComet[] = [];
    let nextCometAt = Number.POSITIVE_INFINITY;

    function removeComet(comet: OrbitComet) {
      scene.remove(comet.line);
      comet.line.geometry.dispose();
      comet.line.material.dispose();
    }

    function spawnComet(now: number, anchor?: THREE.Vector3) {
      if (comets.length >= COMET_MAX_COUNT) return;
      const path = sampleOrbitPath();
      if (!path) return;
      // Anchor the first hop on a waterpond ripple circle when one is nearby,
      // keeping the trajectory's own shape and splat-space orientation.
      const baseX = path.im[0];
      const baseY = -(path.re[0] + 0.5);
      const baseZ = path.cim;
      const startX = anchor ? anchor.x : baseX;
      const startY = anchor ? anchor.y : baseY;
      const startZ = anchor ? anchor.z : baseZ;
      const count = path.re.length;
      const positions = new Float32Array((count + 1) * 3);
      for (let index = 0; index < count; index++) {
        positions[index * 3] = path.im[index] - baseX + startX;
        positions[index * 3 + 1] = -(path.re[index] + 0.5) - baseY + startY;
        positions[index * 3 + 2] = path.cim - baseZ + startZ;
      }
      positions[count * 3] = startX;
      positions[count * 3 + 1] = startY;
      positions[count * 3 + 2] = startZ;
      const colors = new Float32Array((count + 1) * 3);
      for (let index = 0; index <= count; index++) {
        const t = index / count;
        colors[index * 3] = 0.16 + 0.84 * t * t;
        colors[index * 3 + 1] = 0.42 + 0.58 * t;
        colors[index * 3 + 2] = 1;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setDrawRange(0, 0);
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      scene.add(line);
      comets.push({ born: now, count, line });
    }

    function updateComets(now: number) {
      for (let index = comets.length - 1; index >= 0; index--) {
        const comet = comets[index];
        const elapsed = now - comet.born;
        const attribute = comet.line.geometry.getAttribute("position") as THREE.BufferAttribute;
        if (elapsed < COMET_TRAVEL_MS) {
          const travel = (elapsed / COMET_TRAVEL_MS) * (comet.count - 1);
          const segment = Math.min(comet.count - 2, Math.floor(travel));
          const fraction = travel - segment;
          const headIndex = comet.count;
          attribute.setX(headIndex, attribute.getX(segment) + (attribute.getX(segment + 1) - attribute.getX(segment)) * fraction);
          attribute.setY(headIndex, attribute.getY(segment) + (attribute.getY(segment + 1) - attribute.getY(segment)) * fraction);
          attribute.setZ(headIndex, attribute.getZ(segment) + (attribute.getZ(segment + 1) - attribute.getZ(segment)) * fraction);
          attribute.needsUpdate = true;
          comet.line.geometry.setDrawRange(0, segment + 2);
        } else if (elapsed < COMET_TRAVEL_MS + COMET_HOLD_MS) {
          attribute.setX(comet.count, attribute.getX(comet.count - 1));
          attribute.setY(comet.count, attribute.getY(comet.count - 1));
          attribute.setZ(comet.count, attribute.getZ(comet.count - 1));
          attribute.needsUpdate = true;
          comet.line.geometry.setDrawRange(0, comet.count + 1);
        } else {
          const fade = 1 - (elapsed - COMET_TRAVEL_MS - COMET_HOLD_MS) / COMET_FADE_MS;
          if (fade <= 0) {
            removeComet(comet);
            comets.splice(index, 1);
          } else {
            comet.line.material.opacity = 0.78 * fade;
          }
        }
      }
    }

    function removeRipple(ripple: CloudRipple) {
      scene.remove(ripple.group);
      ripple.beacon.material.dispose();
      for (const ring of ripple.rings) ring.material.dispose();
    }

    function pickVisibleSplat() {
      const packed = splat?.packedSplats;
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

    function spawnRippleAt(now: number, position: THREE.Vector3, quaternion: THREE.Quaternion) {
      const group = new THREE.Group();
      group.position.copy(position);
      group.quaternion.copy(quaternion);
      group.quaternion.multiply(new THREE.Quaternion().random());

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
      beacon.scale.setScalar(0.09);
      group.add(beacon);
      scene.add(group);
      ripples.push({ born: now, group, beacon, rings });
    }

    function spawnRipple(now: number) {
      const sample = pickVisibleSplat();
      if (!sample) return;
      spawnRippleAt(now, sample.center, sample.quaternion);
    }

    function updateRipples(now: number) {
      if (splatReady && !reduceMotion && !fadingRef.current && now >= nextRippleAt && ripples.length < 4) {
        spawnRipple(now);
        nextRippleAt = now + 850 + Math.random() * 1_150;
      }
      if (splatReady && !reduceMotion && !fadingRef.current && now >= nextCometAt && comets.length < COMET_MAX_COUNT) {
        // Launch from a point on the newest waterpond circle, if one is alive.
        const latest = ripples[ripples.length - 1];
        let anchor: THREE.Vector3 | undefined;
        if (latest) {
          const ringT = THREE.MathUtils.clamp((now - latest.born) / RIPPLE_LIFETIME_MS, 0, 1);
          const radius = 0.02 + ringT * 0.32;
          const angle = Math.random() * Math.PI * 2;
          anchor = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
            .applyQuaternion(latest.group.quaternion)
            .add(latest.group.position);
        }
        spawnComet(now, anchor);
        nextCometAt = now + 2_600 + Math.random() * 3_400;
      }
      updateComets(now);
      for (let index = ripples.length - 1; index >= 0; index--) {
        const ripple = ripples[index];
        const elapsed = now - ripple.born;
        const beaconT = Math.min(1, elapsed / 760);
        ripple.beacon.material.opacity = Math.pow(1 - beaconT, 1.7);
        ripple.beacon.scale.setScalar(0.06 + Math.sin(beaconT * Math.PI) * 0.065);
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
      splatSize.value = tuneRef.current.splatSize;
      const delta = Math.min(50, now - previousTime);
      previousTime = now;
      if (fadingRef.current) {
        if (!alignFrom) {
          alignFrom = { yaw, pitch, distance, fov: camera.fov, target: { x: target.x, y: target.y, z: target.z } };
          alignStarted = now;
        }
        const elapsed = now - alignStarted;
        const pose = introPlayPose(alignFrom, elapsed, reduceMotion, tuneRef.current);
        yaw = pose.yaw;
        pitch = pose.pitch;
        distance = pose.distance;
        target.set(pose.target.x, pose.target.y, pose.target.z);
        if (splat) splat.scale.z = introPlayFlatten(elapsed, reduceMotion);
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
        setHoveredRegion(null);
      } else {
        alignFrom = null;
        if (splat) splat.scale.z = 1;
        camera.fov = INTRO_PLAY_FOV;
        scene.background = new THREE.Color(0x030408);
        renderer.setClearColor(0x030408, 1);
        if (!reduceMotion && !dragging) yaw += delta * 0.000055;
      }
      camera.updateProjectionMatrix();
      const cosPitch = Math.cos(pitch);
      camera.position.set(
        target.x + Math.sin(yaw) * cosPitch * distance,
        target.y + Math.sin(pitch) * distance,
        target.z + Math.cos(yaw) * cosPitch * distance,
      );
      camera.lookAt(target);
      updateTour(now);
      const strengthTarget = hoveredRegion && !dragging && !fadingRef.current ? 1 : 0;
      regionStrength.value += (strengthTarget - regionStrength.value) * Math.min(1, delta / 140);
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

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      for (const ripple of ripples) removeRipple(ripple);
      for (const comet of comets) removeComet(comet);
      ripples.length = 0;
      rippleGeometry.dispose();
      beaconTexture.dispose();
      if (splat) scene.remove(splat);
      scene.remove(spark);
      renderer.domElement.remove();

      // Spark can still be awaiting its GPU depth readback when React unmounts.
      // Let that readback finish before its render target is disposed.
      const disposeCloud = () => {
        if (spark.sorting || spark.sortTimeoutId !== -1) {
          window.setTimeout(disposeCloud, 16);
          return;
        }
        splat?.dispose();
        spark.dispose();
        renderer.dispose();
      };
      disposeCloud();
    };
  }, [variant, legacySplat, onLoadProgress, onReady, onRegionChange]);

  return (
    <div
      ref={hostRef}
      className={`introCloudHost ${ready ? "ready" : ""} ${fading ? "fading" : ""}`}
      role="img"
      aria-label={`${variant === "classic" ? "True z squared plus c" : "Complex Henon"} precomputed 3D Buddhabrot Gaussian cloud. Drag to orbit.`}
    />
  );
}
