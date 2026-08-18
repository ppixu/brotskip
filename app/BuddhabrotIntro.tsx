"use client";

export default function BuddhabrotIntro({
  progress, fading, ready, onPlay,
}: {
  progress: number;
  fading: boolean;
  ready?: boolean;
  onPlay?: () => void;
}) {
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        {!ready && <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>}
      </div>
      {ready && (
        <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
      )}
    </div>
  );
}
