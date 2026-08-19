"use client";

import { useState } from "react";
import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";
import BuddhabrotCloudCanvas from "./BuddhabrotCloudCanvas";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

export default function BuddhabrotIntro({
  fading, onPlay,
}: {
  fading: boolean;
  onPlay?: () => void;
}) {
  const { wikipedia } = BUDDHABROT_EXPLAIN;
  const [showTrueBuddhabrot, setShowTrueBuddhabrot] = useState(false);
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <BuddhabrotCloudCanvas
        key={showTrueBuddhabrot ? "classic" : "henon"}
        fading={fading}
        variant={showTrueBuddhabrot ? "classic" : "henon"}
      />
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <label className="introSetToggle">
          <input
            type="checkbox"
            checked={showTrueBuddhabrot}
            onChange={(event) => setShowTrueBuddhabrot(event.target.checked)}
          />
          <span>True z² + c Buddhabrot</span>
        </label>
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
      <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
    </div>
  );
}
