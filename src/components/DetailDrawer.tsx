import { STATUS_LABEL, REJECT_REASONS, type Application, type Status } from "../types";
import { pushEvent, withStatusChange } from "../lib/crm";
import "./DetailDrawer.css";

type Props = {
  app: Application | null;
  onClose: () => void;
  onChange: (app: Application) => void;
  onDelete: (id: string) => void;
};

export function DetailDrawer({ app, onClose, onChange, onDelete }: Props) {
  if (!app) return null;
  const current = app;

  function setStatus(status: Status) {
    onChange(withStatusChange(current, status));
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="mono tiny">{STATUS_LABEL[current.status]} · {current.platform}</p>
            <h2>{current.company}</h2>
            <p className="muted">{current.role}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            закрыть
          </button>
        </header>

        <div className="field">
          <label>Статус</label>
          <select value={current.status} onChange={(e) => setStatus(e.target.value as Status)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="drawer-grid">
          <div className="field">
            <label>Вилка</label>
            <input
              value={current.salary || ""}
              onChange={(e) => onChange({ ...current, salary: e.target.value })}
              placeholder="от 180к net"
            />
          </div>
          <div className="field">
            <label>Город</label>
            <input
              value={current.city || ""}
              onChange={(e) => onChange({ ...current, city: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Контакт</label>
            <input
              value={current.contact || ""}
              onChange={(e) => onChange({ ...current, contact: e.target.value })}
              placeholder="@hr"
            />
          </div>
          <div className="field">
            <label>Match</label>
            <input value={current.fitScore != null ? `${current.fitScore}%` : "—"} readOnly />
          </div>
          <div className="field">
            <label>Собес</label>
            <input
              type="date"
              value={current.interviewAt?.slice(0, 10) || ""}
              onChange={(e) => {
                const interviewAt = e.target.value;
                let next: Application = { ...current, interviewAt };
                if (interviewAt && current.status !== "interview") next = withStatusChange(next, "interview");
                else if (interviewAt) next = pushEvent(next, "interview", `Собес ${interviewAt}`);
                onChange(next);
              }}
            />
          </div>
          <div className="field">
            <label>Дедлайн тестового</label>
            <input
              type="date"
              value={current.testDeadline || ""}
              onChange={(e) => {
                const testDeadline = e.target.value;
                onChange(pushEvent({ ...current, testDeadline }, "test", `Тестовое до ${testDeadline}`));
              }}
            />
          </div>
          <div className="field">
            <label>Follow-up</label>
            <input
              type="date"
              value={current.followUp || ""}
              onChange={(e) => onChange({ ...current, followUp: e.target.value })}
            />
          </div>
        </div>

        {current.status === "reject" && (
          <div className="field">
            <label>Причина отказа</label>
            <select
              value={current.rejectReason || ""}
              onChange={(e) =>
                onChange(pushEvent({ ...current, rejectReason: e.target.value }, "reject", e.target.value))
              }
            >
              <option value="">не указана</option>
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Ссылка</label>
          <input
            value={current.url}
            onChange={(e) => onChange({ ...current, url: e.target.value })}
            placeholder="https://"
          />
        </div>

        <div className="field">
          <label>Стек из вакансии</label>
          <input value={current.stack || ""} onChange={(e) => onChange({ ...current, stack: e.target.value })} />
        </div>

        <div className="field">
          <label>Заметка</label>
          <input value={current.note} onChange={(e) => onChange({ ...current, note: e.target.value })} />
        </div>

        <div className="field">
          <label>Заметки к собесу / тестовому</label>
          <textarea
            value={current.interviewNotes || ""}
            onChange={(e) => onChange({ ...current, interviewNotes: e.target.value })}
            placeholder="Что спросили, что ответил, что доучить…"
          />
        </div>

        <section className="timeline">
          <h3>Таймлайн</h3>
          <ul>
            {(current.timeline || []).slice().reverse().map((ev) => (
              <li key={ev.id}>
                <span className="mono tiny">{ev.at.slice(0, 10)}</span>
                <span>{ev.text}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const text = window.prompt("Заметка в таймлайн");
              if (!text?.trim()) return;
              onChange(pushEvent(current, "note", text.trim()));
            }}
          >
            + заметка
          </button>
        </section>

        <div className="actions">
          {current.url && (
            <a className="btn ghost" href={current.url} target="_blank" rel="noreferrer">
              Открыть вакансию
            </a>
          )}
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (confirm(`Удалить ${current.company}?`)) onDelete(current.id);
            }}
          >
            Удалить
          </button>
        </div>
      </aside>
    </div>
  );
}
