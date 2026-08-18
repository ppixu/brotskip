"use client";

import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";

export default function BuddhabrotIntro({
  progress, fading, ready, onPlay, rotateRight = true,
}: {
  progress: number;
  fading: boolean;
  ready?: boolean;
  onPlay?: () => void;
  rotateRight?: boolean;
}) {
  const { gif } = BUDDHABROT_EXPLAIN;
  return (
    <div className={`introOverlay ${fading ? "fading" : ""} ${rotateRight ? "introRotated" : ""}`} role="status" aria-label="Charting the pond">
      <div className="introTraverse" aria-hidden="true">
        <img src={gif.file} alt="" />
      </div>
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
