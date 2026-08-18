import { BUDDHABROT_EXPLAIN } from "@/lib/buddhabrot/explain";

export default function HowItWorks() {
  const { trigger, title, formula, paragraphs } = BUDDHABROT_EXPLAIN;
  return (
    <div className="howItWorks">
      <button type="button" className="howItWorksTrigger" aria-describedby="how-it-works-panel">
        {trigger}
      </button>
      <div id="how-it-works-panel" className="howItWorksPanel" role="tooltip">
        <p className="howItWorksKicker">{title}</p>
        <p className="howItWorksGpuNote">Precomputed 3D Gaussian cloud · 1M splats · no video</p>
        <p className="howItWorksFormula">{formula}</p>
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
