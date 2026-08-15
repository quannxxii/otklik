import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { SAMPLE_JD } from "../types";
import { analyzeVacancy } from "../lib/match";
import { parseVacancy } from "../lib/parse";
import { buildFromRadar, letterFor } from "../lib/crm";
import { copyText } from "../lib/storage";
import { buildSnapshot, localCoach, type CoachReport } from "../lib/coach";
import { loadAiSettings, llmCoach } from "../lib/llm";
import { CoachReportView } from "../components/CoachReport";
import "./Radar.css";

export function RadarPage() {
  const { apps, setApps, profile, templates, showToast, isPro } = useStore();
  const navigate = useNavigate();
  const [jd, setJd] = useState("");
  const [coach, setCoach] = useState<CoachReport | null>(null);
  const [coachErr, setCoachErr] = useState<string | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const parsed = useMemo(() => (jd.trim() ? parseVacancy(jd) : null), [jd]);
  const result = useMemo(
    () =>
      jd.trim()
        ? analyzeVacancy(jd, profile.skills, { isPro, hintStack: parsed?.stack || [] })
        : null,
    [jd, profile.skills, isPro, parsed?.stack],
  );

  useEffect(() => {
    setCoach(null);
    setCoachErr(null);
  }, [jd]);

  function fillDemo() {
    setJd(SAMPLE_JD);
  }

  function makeApp(status: "sent" | "draft" = "sent") {
    if (!result || !parsed) return null;
    const company = parsed.company || result.guessedCompany;
    const role = parsed.role || result.guessedRole;
    const dup = apps.find(
      (a) =>
        (parsed.url && a.url === parsed.url) ||
        (company &&
          a.company.toLowerCase() === company.toLowerCase() &&
          a.role.toLowerCase() === (role || "").toLowerCase()),
    );
    if (dup) {
      showToast("Такой отклик уже есть");
      return null;
    }
    return buildFromRadar({
      parsed,
      match: result,
      profile,
      followDays: profile.followDays,
      jd,
      status,
    });
  }

  function sendToTracker() {
    const app = makeApp("draft");
    if (!app) return;
    setApps((prev) => [...prev, app]);
    showToast("Черновик в трекере");
    navigate("/app");
  }

  async function packageApply() {
    const app = makeApp("draft");
    if (!app) return;
    const letter = letterFor(templates, app.letterTpl, {
      company: app.company,
      vacancy: app.role,
      profile,
      matched: result?.matched.join(", "),
    });
    try {
      await copyText(letter);
    } catch {
      showToast("Не удалось скопировать — разреши буфер обмена");
      return;
    }
    setApps((prev) => [...prev, app]);
    if (app.url) window.open(app.url, "_blank", "noopener,noreferrer");
    showToast("Письмо в буфере, черновик в трекере. На площадке жми «Откликнуться» сам.");
    navigate("/app");
  }

  async function copyTargeted() {
    if (!result || !parsed) return;
    const letter = letterFor(templates, result.suggestedTpl, {
      company: parsed.company || result.guessedCompany || "компании",
      vacancy: parsed.role || result.guessedRole || "вакансию",
      profile,
      matched: result.matched.join(", ") || "частичный стек",
    });
    await copyText(letter);
    showToast("Письмо под вакансию скопировано");
  }

  const company = parsed?.company || result?.guessedCompany;
  const role = parsed?.role || result?.guessedRole;
  const hasKey = Boolean(loadAiSettings().apiKey);

  function runLocalCoach() {
    if (!result || !parsed) return;
    const snap = buildSnapshot(apps, profile, {
      jd,
      match: result,
      company,
      role,
      salary: parsed.salary,
      city: parsed.city,
      stack: parsed.stack,
    });
    setCoachErr(null);
    setCoach(localCoach(snap));
  }

  async function runLlmCoach() {
    if (!result || !parsed) return;
    const settings = loadAiSettings();
    if (!settings.apiKey.trim()) {
      setCoachErr("Нет ключа — локальный разбор уже можно. Ключ в Профиле.");
      runLocalCoach();
      return;
    }
    setCoachBusy(true);
    setCoachErr(null);
    try {
      const snap = buildSnapshot(apps, profile, {
        jd,
        match: result,
        company,
        role,
        salary: parsed.salary,
        city: parsed.city,
        stack: parsed.stack,
      });
      setCoach(await llmCoach(snap, settings));
      showToast("ИИ по вакансии готов");
    } catch (e) {
      setCoachErr(e instanceof Error ? e.message : "Не вышло вызвать модель");
      runLocalCoach();
    } finally {
      setCoachBusy(false);
    }
  }

  return (
    <div className="radar">
      <div className="radar-head">
        <div>
          <p className="mono eyebrow">vacancy radar</p>
          <h2>Вставь вакансию — откликнись за один клик</h2>
          <p className="muted">
            Парсим роль, компанию, вилку, город, стек. «Пакет» копирует письмо и пишет черновик —
            на площадке «Откликнуться» жмёшь сам. Match считается по стеку вакансии, не по ширине твоего резюме.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={fillDemo}>
          Демо-вакансия
        </button>
      </div>

      <div className="radar-grid">
        <div className="field">
          <label>Текст или ссылка + описание с hh / Хабра / LinkedIn</label>
          <textarea
            className="radar-ta"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Ctrl+V сюда. Если только ссылка — добавь текст вакансии: браузер не даст скачать hh напрямую."
          />
        </div>

        <div className={`radar-score card ${result ? "live" : ""}`}>
          {!result || !parsed ? (
            <p className="muted">Жду текст. Чем полнее описание, тем точнее парсер и матч.</p>
          ) : (
            <>
              <div className="score-ring" style={{ ["--p" as string]: `${result.score}%` }}>
                <span className="score-ring-label">
                  <strong>{result.score}</strong>
                  <span>match</span>
                </span>
              </div>
              <p className="verdict">{result.verdict}</p>
              <dl className="guess mono">
                <div><dt>роль</dt><dd>{role || "—"}</dd></div>
                <div><dt>компания</dt><dd>{company || "—"}</dd></div>
                <div><dt>вилка</dt><dd>{parsed.salary || "—"}</dd></div>
                <div><dt>город</dt><dd>{parsed.city || "—"}</dd></div>
                <div><dt>площадка</dt><dd>{parsed.platform}</dd></div>
                <div><dt>шаблон</dt><dd>{result.suggestedTpl}</dd></div>
              </dl>
              <div className="tags">
                <div>
                  <h4>Пересечение</h4>
                  <div className="tag-row">
                    {result.matched.length
                      ? result.matched.map((m) => <span key={m} className="tag ok">{m}</span>)
                      : <span className="muted">пусто</span>}
                  </div>
                </div>
                {result.missing.length > 0 && (
                  <div>
                    <h4>Нет у тебя из JD</h4>
                    <div className="tag-row">
                      {result.missing.map((m) => (
                        <span key={m} className="tag">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {parsed.stack.length > 0 && (
                  <div>
                    <h4>Стек из вакансии</h4>
                    <div className="tag-row">
                      {parsed.stack.map((m) => <span key={m} className="tag">{m}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="actions">
                <button type="button" className="btn accent" onClick={() => void packageApply()}>
                  Откликнуться пакетом
                </button>
                <button type="button" className="btn ghost" onClick={sendToTracker}>
                  Только черновик
                </button>
                <button type="button" className="btn ghost" onClick={() => void copyTargeted()}>
                  Письмо
                </button>
                <button type="button" className="btn ghost" onClick={runLocalCoach}>
                  Спросить коуча
                </button>
                <button type="button" className="btn ghost" onClick={() => void runLlmCoach()} disabled={coachBusy}>
                  {coachBusy ? "Думаю…" : hasKey ? "Углубить с ИИ" : "ИИ (нужен ключ)"}
                </button>
                <Link className="btn ghost" to="/app/settings">
                  Стек
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {(coach || coachErr) && (
        <div className="card radar-coach">
          <CoachReportView report={coach} error={coachErr} />
        </div>
      )}
    </div>
  );
}
