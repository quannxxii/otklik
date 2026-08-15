import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { today } from "../lib/storage";
import { weekItems } from "../lib/crm";
import "./Week.css";

export function WeekPage() {
  const { apps } = useStore();
  const navigate = useNavigate();
  const [from, setFrom] = useState(today());
  const { days, items } = useMemo(() => weekItems(apps, from), [apps, from]);

  return (
    <div>
      <div className="week-head">
        <div>
          <h2>Неделя</h2>
          <p className="muted">Собесы, тестовые и follow-up на 7 дней вперёд.</p>
        </div>
        <div className="field">
          <label>С</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="week-grid">
        {days.map((day) => {
          const cell = items.filter((i) => i.date === day);
          return (
            <section key={day} className="week-col card">
              <header>
                <b>{formatDay(day)}</b>
                <span className="mono tiny">{day.slice(5)}</span>
              </header>
              {!cell.length && <p className="tiny muted">пусто</p>}
              {cell.map((item) => (
                <button
                  key={`${item.kind}-${item.app.id}`}
                  type="button"
                  className={`week-item ${item.kind}`}
                  onClick={() => navigate(`/app?open=${item.app.id}`)}
                >
                  <span className="mono tiny">{item.label}</span>
                  <b>{item.app.company}</b>
                  <span className="tiny">{item.app.role}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "short" });
}
