"use client";

import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

export default function BuddhabrotIntro({
  progress, fading, ready, onPlay,
}: {
  progress: number;
  fading: boolean;
  ready?: boolean;
  onPlay?: () => void;
}) {
  const { wikipedia } = BUDDHABROT_EXPLAIN;
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
        <span className="introMode">GPU pre-iterate · looping depth slice</span>
        {!ready && <span className="liveProgress"><i style={{ width: `${Math.max(2, progress * 100)}%` }} /></span>}
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
      {ready && (
        <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
      )}
    </div>
  );
}
