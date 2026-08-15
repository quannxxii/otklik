import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { buildSnapshot, localCoach, type CoachReport } from "../lib/coach";
import { loadAiSettings, llmCoach } from "../lib/llm";
import { copyText } from "../lib/storage";
import { WEEK_RHYTHM } from "../lib/pro";
import { CoachReportView } from "../components/CoachReport";
import "./Coach.css";

export function CoachPage() {
  const navigate = useNavigate();
  const { apps, profile, showToast, isPro } = useStore();
  const snap = useMemo(() => buildSnapshot(apps, profile), [apps, profile]);
  const local = useMemo(() => localCoach(snap), [snap]);
  const [report, setReport] = useState<CoachReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ai = loadAiSettings();
  const shown = report || local;

  async function deepen() {
    const settings = loadAiSettings();
    if (!settings.apiKey.trim()) {
      setError("Сначала вставь API-ключ в Профиле. Локальный разбор уже ниже.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await llmCoach(snap, settings);
      setReport(next);
      showToast("ИИ-разбор готов");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вышло вызвать модель");
    } finally {
      setBusy(false);
    }
  }

  function copyWeekPlan() {
    if (!isPro) {
      showToast("Копия плана — в Pro");
      navigate("/app/pro");
      return;
    }
    const r = shown;
    const lines = [
      `План поиска — ${profile.name || "кандидат"}`,
      r.headline,
      "",
      "Действия:",
      ...r.actions.map((a, i) => `${i + 1}. ${a.title} — ${a.why}`),
      "",
      "Сегодня:",
      ...(r.today.length ? r.today.map((t) => `• ${t}`) : ["• follow-up пуст — 3–5 точечных откликов"]),
      "",
      "Не делать:",
      r.skip,
      "",
      "Письмо:",
      r.letter,
      "",
      r.gaps.length ? `Пробелы: ${r.gaps.join(", ")}` : "",
      "",
      WEEK_RHYTHM,
    ].filter((x) => x !== "");
    void copyText(lines.join("\n")).then(() => showToast("План скопирован"));
  }

  return (
    <div className="coach-page">
      <div className="coach-head">
        <div>
          <p className="mono eyebrow">career coach</p>
          <h2>Разбор поиска</h2>
          <p className="muted">
            Локальный коуч читает все отклики сразу. ИИ — только если есть свой ключ, запрос уходит с этого устройства.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn accent" onClick={() => void deepen()} disabled={busy}>
            {busy ? "Думаю…" : "Углубить с ИИ"}
          </button>
          <button type="button" className="btn ghost" onClick={copyWeekPlan}>
            {isPro ? "Скопировать план" : "План · Pro"}
          </button>
          {!ai.apiKey && (
            <Link className="btn ghost" to="/app/settings">
              Ключ в профиле
            </Link>
          )}
          {!isPro && (
            <Link className="btn ghost" to="/app/pro">
              Pro
            </Link>
          )}
        </div>
      </div>
      <div className="card coach-body">
        <CoachReportView report={shown} error={error} />
      </div>
    </div>
  );
}
