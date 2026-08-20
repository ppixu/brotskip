"use client";

import { useCallback, useState } from "react";
import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";
import type { IntroPlayTune } from "@/lib/intro-play";
import BuddhabrotCloudCanvas from "./BuddhabrotCloudCanvas";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

export default function BuddhabrotIntro({
  fading, onPlay, tune,
}: {
  fading: boolean;
  onPlay?: () => void;
  tune?: Partial<IntroPlayTune>;
}) {
  const { wikipedia } = BUDDHABROT_EXPLAIN;
  const [showTrueBuddhabrot, setShowTrueBuddhabrot] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [splatReady, setSplatReady] = useState(false);
  const handleLoadProgress = useCallback((progress: number) => setLoadProgress(progress), []);
  const handleReady = useCallback(() => setSplatReady(true), []);
  const selectBuddhabrot = (showTrue: boolean) => {
    setShowTrueBuddhabrot(showTrue);
    setLoadProgress(0);
    setSplatReady(false);
  };
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <BuddhabrotCloudCanvas
        key={showTrueBuddhabrot ? "classic" : "henon"}
        fading={fading}
        variant={showTrueBuddhabrot ? "classic" : "henon"}
        tune={tune}
        onLoadProgress={handleLoadProgress}
        onReady={handleReady}
      />
      <div className="introChrome">
        <label className="introSetToggle">
          <input
            type="checkbox"
            checked={showTrueBuddhabrot}
            onChange={(event) => selectBuddhabrot(event.target.checked)}
          />
          <span>True z² + c Buddhabrot</span>
        </label>
        <span
          className={`introLoadProgress ${splatReady ? "complete" : ""}`}
          role="progressbar"
          aria-label="Loading Buddhabrot splats"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(loadProgress * 100)}
        >
          <i style={{ width: `${loadProgress * 100}%` }} />
        </span>
      </div>
      <article className="introPaper" aria-label="Buddhabrot, from Wikipedia">
        <p className="introPaperJournal">{wikipedia.journal}</p>
        <h1 className="introPaperTitle">{wikipedia.title}</h1>
        <p className="introPaperLede">
          {wikipedia.sentences.map((sentence) => (
            <span key={sentence.cite}>
              {paperWords(sentence.text)}
              <sup className="introPaperCite">
                <a href={wikipedia.references[sentence.cite - 1].url} target="_blank" rel="noreferrer">
                  [{sentence.cite}]
                </a>
              </sup>
              {" "}
            </span>
          ))}
        </p>
      </article>
      {splatReady && (
        <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
      )}
    </div>
  );
}
