import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { SAMPLE_JD } from "../types";
import { analyzeVacancy } from "../lib/match";
import { copyText, renderLetter } from "../lib/storage";
import "./Radar.css";

export function RadarPage({
  onApply,
}: {
  onApply?: (data: {
    company: string;
    role: string;
    url: string;
    letterTpl: string;
    fitScore: number;
    matched: string;
    jd: string;
  }) => void;
}) {
  const { profile, templates, showToast } = useStore();
  const navigate = useNavigate();
  const [jd, setJd] = useState("");
  const result = useMemo(
    () => (jd.trim() ? analyzeVacancy(jd, profile.skills) : null),
    [jd, profile.skills],
  );

  function fillDemo() {
    setJd(SAMPLE_JD);
  }

  function sendToTracker() {
    if (!result) return;
    const payload = {
      company: result.guessedCompany || "Компания",
      role: result.guessedRole || profile.role || "Разработчик",
      url: result.urls[0] || "",
      letterTpl: result.suggestedTpl,
      fitScore: result.score,
      matched: result.matched.join(", "),
      jd,
    };
    if (onApply) onApply(payload);
    else {
      sessionStorage.setItem("otklik-radar-draft", JSON.stringify(payload));
      navigate("/app");
    }
    showToast("Черновик ушёл в трекер");
  }

  async function copyTargeted() {
    if (!result) return;
    const tpl =
      templates.find((t) => t.id === result.suggestedTpl) ||
      templates.find((t) => t.id === "targeted") ||
      templates[0];
    if (!tpl) return;
    await copyText(
      renderLetter(tpl.body, {
        company: result.guessedCompany || "компании",
        vacancy: result.guessedRole || "вакансию",
        profile,
        matched: result.matched.join(", ") || "частичный стек",
      }),
    );
    showToast("Письмо под вакансию скопировано");
  }

  return (
    <div className="radar">
      <div className="radar-head">
        <div>
          <p className="mono eyebrow">vacancy radar</p>
          <h2>Вставь вакансию — узнай, стоит ли откликаться</h2>
          <p className="muted">
            Локальный матч по твоему стеку из профиля. Без нейросети, без утечки текста на сервер.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={fillDemo}>
          Демо-вакансия
        </button>
      </div>

      <div className="radar-grid">
        <div className="field">
          <label>Текст вакансии</label>
          <textarea
            className="radar-ta"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Ctrl+V сюда описание с hh / Хабра / LinkedIn…"
          />
        </div>

        <div className={`radar-score card ${result ? "live" : ""}`}>
          {!result ? (
            <p className="muted">Жду текст. Чем длиннее описание, тем точнее матч.</p>
          ) : (
            <>
              <div className="score-ring" style={{ ["--p" as string]: `${result.score}%` }}>
                <strong>{result.score}</strong>
                <span>match</span>
              </div>
              <p className="verdict">{result.verdict}</p>
              <div className="tags">
                <div>
                  <h4>Есть пересечение</h4>
                  <div className="tag-row">
                    {result.matched.length
                      ? result.matched.map((m) => <span key={m} className="tag ok">{m}</span>)
                      : <span className="muted">пусто</span>}
                  </div>
                </div>
                <div>
                  <h4>В профиле, но не в вакансии</h4>
                  <div className="tag-row">
                    {result.missing.slice(0, 8).map((m) => (
                      <span key={m} className="tag">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <dl className="guess mono">
                <div><dt>роль</dt><dd>{result.guessedRole || "—"}</dd></div>
                <div><dt>компания</dt><dd>{result.guessedCompany || "—"}</dd></div>
                <div><dt>шаблон</dt><dd>{result.suggestedTpl}</dd></div>
              </dl>
              <div className="actions">
                <button type="button" className="btn accent" onClick={sendToTracker}>
                  В трекер
                </button>
                <button type="button" className="btn ghost" onClick={() => void copyTargeted()}>
                  Копировать письмо
                </button>
                <Link className="btn ghost" to="/app/settings">
                  Править стек
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
