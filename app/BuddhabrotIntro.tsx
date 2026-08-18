"use client";

import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";

function paperWords(text: string) {
  return text.split(/\b(tika|ushnisha)\b/).map((part, index) => (
    part === "tika" || part === "ushnisha" ? <i key={index}>{part}</i> : part
  ));
}

export default function BuddhabrotIntro({
  progress, fading, ready, onPlay, rotateRight,
}: {
  progress: number;
  fading: boolean;
  ready?: boolean;
  onPlay?: () => void;
  rotateRight?: boolean;
}) {
  const { gif, wikipedia } = BUDDHABROT_EXPLAIN;
  return (
    <div className={`introOverlay ${fading ? "fading" : ""}`} role="status" aria-label="Charting the pond">
      <div className={`introTraverse${rotateRight === false ? "" : " rotated"}`}>
        <img src={gif.file} alt={gif.alt} width={600} height={337} />
      </div>
      <div className="introChrome">
        <span className="introTitle">Mandelbrot Skipping</span>
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
        <ol className="introPaperRefs">
          {wikipedia.references.map((reference) => (
            <li key={reference.n} value={reference.n}>
              <a href={reference.url} target="_blank" rel="noreferrer">{reference.text}</a>
            </li>
          ))}
        </ol>
      </article>
      {ready && (
        <button type="button" className="introPlay" onClick={onPlay} aria-label="Play">Play</button>
      )}
    </div>
  );
}
