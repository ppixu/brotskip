"use client";

export default function BuddhabrotIntro({
  progress, fading,
}: {
  progress: number;
  fading: boolean;
}) {
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>
      </div>
    </div>
  );
}
