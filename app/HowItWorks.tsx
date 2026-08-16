import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";

export default function HowItWorks() {
  const { trigger, title, formula, paragraphs, gif } = BUDDHABROT_EXPLAIN;
  return (
    <div className="howItWorks">
      <button type="button" className="howItWorksTrigger" aria-describedby="how-it-works-panel">
        {trigger}
      </button>
      <div id="how-it-works-panel" className="howItWorksPanel" role="tooltip">
        <p className="howItWorksKicker">{title}</p>
        <img
          className="howItWorksFilm"
          src={gif.file}
          alt={gif.alt}
          width={600}
          height={337}
        />
        <p className="howItWorksFormula">{formula}</p>
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <p className="howItWorksCredit">
          Animation:{" "}
          <a href={gif.sourceUrl} target="_blank" rel="noreferrer">
            {gif.credit}
          </a>
          ,{" "}
          <a href={gif.licenseUrl} target="_blank" rel="noreferrer">
            {gif.license}
          </a>
          . Summary after the{" "}
          <a href={gif.articleUrl} target="_blank" rel="noreferrer">
            Wikipedia Buddhabrot article
          </a>
          .
        </p>
      </div>
    </div>
  );
}
