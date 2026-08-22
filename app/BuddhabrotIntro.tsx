"use client";

import { useCallback, useState } from "react";
import type { SplatRegion } from "@/lib/splat-regions";
import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";
import BuddhabrotCloudCanvas from "./BuddhabrotCloudCanvas";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

function ExternalLinkIcon() {
  return (
    <svg className="externalLinkIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export default function BuddhabrotIntro({
  fading, onPlay, legacySplat, onLegacySplatChange,
}: {
  fading: boolean;
  onPlay?: () => void;
  legacySplat: boolean;
  onLegacySplatChange: (value: boolean) => void;
}) {
  const { introFormula, wikipedia } = BUDDHABROT_EXPLAIN;
  const [loadProgress, setLoadProgress] = useState(0);
  const [splatReady, setSplatReady] = useState(false);
  const [region, setRegion] = useState<SplatRegion | null>(null);
  const [regionVisible, setRegionVisible] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const handleLoadProgress = useCallback((progress: number) => setLoadProgress(progress), []);
  const handleReady = useCallback(() => setSplatReady(true), []);
  const handleRegionChange = useCallback((next: SplatRegion | null) => {
    if (next) {
      setRegion(next);
      setRegionVisible(true);
    } else {
      setRegionVisible(false);
    }
  }, []);
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <BuddhabrotCloudCanvas
        fading={fading}
        variant="classic"
        legacySplat={legacySplat}
        onLoadProgress={handleLoadProgress}
        onReady={handleReady}
        onRegionChange={handleRegionChange}
      >
        {region && (
          <aside
            className={`introRegionCard ${regionVisible || cardHovered ? "visible" : ""}`}
            aria-live="polite"
            onPointerEnter={() => setCardHovered(true)}
            onPointerLeave={() => setCardHovered(false)}
          >
            <h3 className="introRegionName">{region.name}</h3>
            <p className="introRegionBlurb">
              {region.blurb}
              {region.link && (
                <>
                  {" "}
                  <a className="introPaperWiki" href={region.link} target="_blank" rel="noreferrer">
                    Wikipedia
                  </a>
                  <span className="introPaperWikiBox"><ExternalLinkIcon /></span>
                </>
              )}
            </p>
          </aside>
        )}
      </BuddhabrotCloudCanvas>
      <div className="introChrome">
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
        <p className="introPaperFormula" aria-label="Buddhabrot iteration formula">
          {introFormula}
        </p>
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
          {" "}
          <a className="introPaperWiki" href={wikipedia.references[1].url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
          <span className="introPaperWikiBox"><ExternalLinkIcon /></span>
        </p>
      </article>
      {splatReady && (
        <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
      )}
      <label className="introDebugToggle">
        <input
          type="checkbox"
          checked={legacySplat}
          aria-label="Load the legacy SPZ splat cloud instead of the compact format"
          onChange={(event) => onLegacySplatChange(event.target.checked)}
        />
        Legacy splat
      </label>
    </div>
  );
}
