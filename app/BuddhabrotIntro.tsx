"use client";

import { useCallback, useState } from "react";
import type { SplatRegion } from "@/lib/splat-regions";
import { BUDDHABROT_EXPLAIN, MANDELBROT_EXPLAIN } from "@/lib/buddhabrot/explain";
import BuddhabrotCloudCanvas from "./BuddhabrotCloudCanvas";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

export default function BuddhabrotIntro({
  fading, onPlay, playerName, onPlayerNameChange, legacySplat, onLegacySplatChange,
}: {
  fading: boolean;
  onPlay?: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  legacySplat: boolean;
  onLegacySplatChange: (value: boolean) => void;
}) {
  const { wikipedia } = BUDDHABROT_EXPLAIN;
  const mandelbrot = MANDELBROT_EXPLAIN;
  const [loadProgress, setLoadProgress] = useState(0);
  const [splatReady, setSplatReady] = useState(false);
  const [region, setRegion] = useState<SplatRegion | null>(null);
  const [regionVisible, setRegionVisible] = useState(false);
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
      />
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
      {region && (
        <aside className={`introRegionCard ${regionVisible ? "visible" : ""}`} aria-live="polite">
          <h3 className="introRegionName">{region.name}</h3>
          <p className="introRegionBlurb">
            {region.blurb}
            {region.link && (
              <>
                {" "}
                <a className="introPaperWiki" href={region.link} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>
                <span className="introPaperWikiBox">↗</span>
              </>
            )}
          </p>
        </aside>
      )}
      <article className="introPaper introPaperRight" aria-label="Buddhabrot, from Wikipedia">
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
          {" "}
          <a className="introPaperWiki" href={wikipedia.references[1].url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
          <span className="introPaperWikiBox">↗</span>
        </p>
        <figure className="introPaperFigure">
          <img src={BUDDHABROT_EXPLAIN.image.src} alt={BUDDHABROT_EXPLAIN.image.alt} loading="lazy" />
        </figure>
      </article>
      <article className="introPaper" aria-label="Mandelbrot set, from Wikipedia">
        <p className="introPaperJournal">{mandelbrot.journal}</p>
        <h2 className="introPaperTitle">{mandelbrot.title}</h2>
        <p className="introPaperLede">
          {mandelbrot.lede}{" "}
          <a className="introPaperWiki" href={mandelbrot.source.url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
          <span className="introPaperWikiBox">↗</span>
        </p>
        <figure className="introPaperFigure">
          <img src={mandelbrot.image.src} alt={mandelbrot.image.alt} loading="lazy" />
        </figure>
      </article>
      <div className="introNameEntry">
        <label className="introNameLabel" htmlFor="intro-name">Your name</label>
        <input
          id="intro-name"
          className="introNameInput"
          aria-label="High score name"
          autoComplete="nickname"
          maxLength={12}
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
        />
      </div>
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
