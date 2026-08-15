import { useMemo } from "react";
import { DEFAULT_PROFILE, DEFAULT_TEMPLATES, SAMPLE_JD } from "../types";
import { PRO_TEMPLATES } from "../lib/pro";
import { analyzeVacancy } from "../lib/match";
import { parseVacancy } from "../lib/parse";
import { renderLetter } from "../lib/storage";
import "./LetterPreview.css";

const DEMO: typeof DEFAULT_PROFILE = {
  ...DEFAULT_PROFILE,
  name: "Никита",
  portfolio: "https://nikita-dodiev.vercel.app",
  github: "https://github.com/quannxxii",
};

type Props = { compact?: boolean };

export function LetterPreview({ compact }: Props) {
  const parsed = useMemo(() => parseVacancy(SAMPLE_JD), []);
  const match = useMemo(() => analyzeVacancy(SAMPLE_JD, DEMO.skills, { hintStack: parsed.stack }), [parsed.stack]);
  const vars = {
    company: parsed.company || "СеверТех",
    vacancy: parsed.role || "Frontend / Fullstack",
    profile: DEMO,
    matched: match.matched.slice(0, 6).join(", "),
  };
  const freeTpl = DEFAULT_TEMPLATES.find((t) => t.id === "fullstack") || DEFAULT_TEMPLATES[0];
  const proTpl = PRO_TEMPLATES.find((t) => t.id === "pro-senior") || PRO_TEMPLATES[0];
  const free = renderLetter(freeTpl.body, vars);
  const pro = renderLetter(proTpl.body, vars);

  return (
    <div className={`letter-preview${compact ? " compact" : ""}`}>
      <div className="letter-preview-head">
        <p className="mono tiny">демо · та же вакансия</p>
        <p className="muted tiny">Free — общий абзац. Pro — пересечения списком, короче.</p>
      </div>
      <div className="letter-preview-grid">
        <article>
          <header>
            <span className="mono tiny">free</span>
            <b>{freeTpl.title}</b>
          </header>
          <pre>{free}</pre>
        </article>
        <article className="pro">
          <header>
            <span className="mono tiny">pro</span>
            <b>{proTpl.title}</b>
          </header>
          <pre>{pro}</pre>
        </article>
      </div>
    </div>
  );
}
