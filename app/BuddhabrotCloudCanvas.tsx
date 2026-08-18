"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

export default function BuddhabrotCloudCanvas({ fading }: { fading: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 20);
    const target = new THREE.Vector3(0, 0, 0);
    let yaw = 0.72;
    const pitch = 0.32;
    const distance = 6.3;

    const spark = new SparkRenderer({
      renderer,
      minPixelRadius: 0.02,
      maxStdDev: 2.15,
      blurAmount: 0,
      falloff: 1,
      sortRadial: true,
    });
    scene.add(spark);

    const assetUrl = new URL("henon-buddhabrot-4096.spz", window.location.href).href;
    const splat = new SplatMesh({ url: assetUrl, lod: false });
    splat.opacity = 0.82;
    scene.add(splat);

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
      if (!reduceMotion) yaw += delta * 0.000055;
      const cosPitch = Math.cos(pitch);
      camera.position.set(
        target.x + Math.sin(yaw) * cosPitch * distance,
        target.y + Math.sin(pitch) * distance,
        target.z + Math.cos(yaw) * cosPitch * distance,
      );
      camera.lookAt(target);
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
      if (!disposed) setReady(true);
    }).catch(() => {
      if (!disposed) setReady(false);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      scene.remove(splat);
      scene.remove(spark);
      splat.dispose();
      spark.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`introCloudHost ${ready ? "ready" : ""} ${fading ? "fading" : ""}`}
      role="img"
      aria-label="Rotating precomputed 3D Buddhabrot Gaussian cloud"
    />
  );
}
