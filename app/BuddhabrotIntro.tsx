"use client";

import { useCallback, useState } from "react";
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
  fading, onPlay, playerName, onPlayerNameChange,
}: {
  fading: boolean;
  onPlay?: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  }) {
  const { wikipedia } = BUDDHABROT_EXPLAIN;
  const [loadProgress, setLoadProgress] = useState(0);
  const [splatReady, setSplatReady] = useState(false);
  const handleLoadProgress = useCallback((progress: number) => setLoadProgress(progress), []);
  const handleReady = useCallback(() => setSplatReady(true), []);
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <BuddhabrotCloudCanvas
        fading={fading}
        variant="classic"
        onLoadProgress={handleLoadProgress}
        onReady={handleReady}
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
          {" "}
          <a className="introPaperWiki" href={wikipedia.references[1].url} target="_blank" rel="noreferrer">
            Wikipedia
          </a>
          <span className="introPaperWikiBox"><ExternalLinkIcon /></span>
        </p>
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
    </div>
  );
}
