import { Link } from "react-router-dom";
import type { CoachReport } from "../lib/coach";
import { safeAppHref } from "../lib/coach";
import "./CoachReport.css";

export function CoachReportView({ report, error }: { report: CoachReport | null; error?: string | null }) {
  if (!report?.headline && !error) return null;

  return (
    <div className="coach-report">
      {error && <p className="coach-err">{error}</p>}
      {report?.headline && (
        <p className="mono tiny coach-src">{report.source === "llm" ? "ИИ" : "локальный разбор"}</p>
      )}
      {report?.headline && <h3>{report.headline}</h3>}
      {!!report?.actions.length && (
        <ol className="coach-actions">
          {report.actions.map((a) => {
            const href = safeAppHref(a.href);
            return (
              <li key={a.id}>
                {href ? <Link to={href}>{a.title}</Link> : <b>{a.title}</b>}
                <span>{a.why}</span>
              </li>
            );
          })}
        </ol>
      )}
      {report && (
        <div className="coach-blocks">
          {report.funnel && (
            <section>
              <h4>Воронка</h4>
              <p>{report.funnel}</p>
            </section>
          )}
          {report.today.length > 0 && (
            <section>
              <h4>Сегодня</h4>
              <ul>
                {report.today.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}
          {report.skip && (
            <section>
              <h4>Не делай</h4>
              <p>{report.skip}</p>
            </section>
          )}
          {report.letter && (
            <section>
              <h4>Письмо</h4>
              <p>{report.letter}</p>
            </section>
          )}
          {report.gaps.length > 0 && (
            <section>
              <h4>Пробелы</h4>
              <div className="tag-row">
                {report.gaps.map((g) => (
                  <span key={g} className="tag">{g}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
