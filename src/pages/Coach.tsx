import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { buildSnapshot, localCoach, type CoachReport } from "../lib/coach";
import { loadAiSettings, llmCoach } from "../lib/llm";
import { CoachReportView } from "../components/CoachReport";
import "./Coach.css";

export function CoachPage() {
  const { apps, profile, showToast } = useStore();
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
          {!ai.apiKey && (
            <Link className="btn ghost" to="/app/settings">
              Ключ в профиле
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
