import type { Application } from "../types";
import { STATUS_LABEL } from "../types";
import "./DetailDrawer.css";

type Props = {
  app: Application | null;
  onClose: () => void;
  onChange: (app: Application) => void;
  onDelete: (id: string) => void;
};

export function DetailDrawer({ app, onClose, onChange, onDelete }: Props) {
  if (!app) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="mono tiny">{STATUS_LABEL[app.status]} · {app.platform}</p>
            <h2>{app.company}</h2>
            <p className="muted">{app.role}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            закрыть
          </button>
        </header>

        <div className="drawer-grid">
          <div className="field">
            <label>Вилка / зарплата</label>
            <input
              value={app.salary || ""}
              onChange={(e) => onChange({ ...app, salary: e.target.value })}
              placeholder="от 180к net"
            />
          </div>
          <div className="field">
            <label>Контакт</label>
            <input
              value={app.contact || ""}
              onChange={(e) => onChange({ ...app, contact: e.target.value })}
              placeholder="@hr или email"
            />
          </div>
          <div className="field">
            <label>Match</label>
            <input value={app.fitScore != null ? `${app.fitScore}%` : "—"} readOnly />
          </div>
          <div className="field">
            <label>Follow-up</label>
            <input
              type="date"
              value={app.followUp || ""}
              onChange={(e) => onChange({ ...app, followUp: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label>Ссылка</label>
          <input
            value={app.url}
            onChange={(e) => onChange({ ...app, url: e.target.value })}
            placeholder="https://"
          />
        </div>

        <div className="field">
          <label>Заметка</label>
          <input value={app.note} onChange={(e) => onChange({ ...app, note: e.target.value })} />
        </div>

        <div className="field">
          <label>Заметки к собесу / тестовому</label>
          <textarea
            value={app.interviewNotes || ""}
            onChange={(e) => onChange({ ...app, interviewNotes: e.target.value })}
            placeholder="Что спросили, что ответил, что доучить…"
          />
        </div>

        <div className="actions">
          {app.url && (
            <a className="btn ghost" href={app.url} target="_blank" rel="noreferrer">
              Открыть вакансию
            </a>
          )}
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (confirm(`Удалить ${app.company}?`)) onDelete(app.id);
            }}
          >
            Удалить
          </button>
        </div>
      </aside>
    </div>
  );
}
