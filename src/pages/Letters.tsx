import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { copyText, renderLetter } from "../lib/storage";

export function LettersPage() {
  const { profile, templates, setTemplates, apps, showToast, isPro } = useStore();
  const [tplId, setTplId] = useState(templates[0]?.id || "");
  const [company, setCompany] = useState("");
  const [vacancy, setVacancy] = useState("");
  const current = templates.find((t) => t.id === tplId) || templates[0];
  const text = current ? renderLetter(current.body, { company, vacancy, profile }) : "";

  return (
    <div className="card">
      <div className="form-head">
        <div>
          <h2>Сопроводительные</h2>
          <p className="tiny">
            {"{{name}} {{role}} {{city}} {{company}} {{vacancy}} {{matched}} {{matched_lines}} {{links}}"}
          </p>
        </div>
        {!isPro && (
          <Link className="btn ghost" to="/app/pro">
            Pro-шаблоны →
          </Link>
        )}
      </div>
      <div className="tpl-pick">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${t.id === current?.id ? "" : "ghost"}`}
            onClick={() => setTplId(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="field">
          <label>Компания</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="field">
          <label>Вакансия</label>
          <input value={vacancy} onChange={(e) => setVacancy(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Текст</label>
        <textarea value={text} readOnly />
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={() => void copyText(text).then(() => showToast("Скопировано"))}>
          Скопировать
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            const last = [...apps].sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date))[0];
            if (!last) {
              showToast("Нет откликов");
              return;
            }
            setCompany(last.company);
            setVacancy(last.role);
            setTplId(last.letterTpl);
            showToast("Из последнего отклика");
          }}
        >
          Из последнего отклика
        </button>
      </div>
      {current && (
        <div style={{ marginTop: 20 }}>
          <h2>Редактировать «{current.title}»</h2>
          <div className="field">
            <label>Тело шаблона</label>
            <textarea
              value={current.body}
              onChange={(e) => {
                setTemplates(templates.map((t) => (t.id === current.id ? { ...t, body: e.target.value } : t)));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
