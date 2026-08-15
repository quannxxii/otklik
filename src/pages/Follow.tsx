import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { addDays, copyText, daysBetween, needsFollowUp, renderLetter, today } from "../lib/storage";
import { pushEvent } from "../lib/crm";

export function FollowPage() {
  const { apps, setApps, profile, templates, showToast, isPro } = useStore();
  const navigate = useNavigate();
  const list = apps
    .filter((a) => needsFollowUp(a, profile.followDays))
    .sort((a, b) => a.date.localeCompare(b.date));
  const followTpl = templates.find((t) => t.id === "followup") || templates[templates.length - 1];

  return (
    <div className="card">
      <div className="form-head">
        <div>
          <h2>Кому написать сегодня</h2>
          <p className="tiny">{list.length ? `Ждут follow-up: ${list.length}` : "Пока некого догонять."}</p>
        </div>
        {list.length > 0 && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (!isPro) {
                showToast("Пакет follow-up — в Pro");
                navigate("/app/pro");
                return;
              }
              if (!followTpl) return;
              const pack = list
                .map(
                  (a) =>
                    `--- ${a.company} ---\n` +
                    renderLetter(followTpl.body, { company: a.company, vacancy: a.role, profile }),
                )
                .join("\n\n");
              void copyText(pack).then(() => showToast(`Скопировано ${list.length} писем`));
            }}
          >
            {isPro ? "Все письма в буфер" : "Все письма · Pro"}
          </button>
        )}
      </div>
      <div className="table-wrap" style={{ marginTop: 12, border: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Компания</th>
              <th>Роль</th>
              <th>Отклик</th>
              <th>Дней</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!list.length && (
              <tr>
                <td colSpan={5} className="muted">
                  Пусто
                </td>
              </tr>
            )}
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  <b>{a.company}</b>
                </td>
                <td>{a.role}</td>
                <td>{a.date}</td>
                <td>{daysBetween(a.date, today())}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        if (!followTpl) return;
                        void copyText(
                          renderLetter(followTpl.body, { company: a.company, vacancy: a.role, profile }),
                        ).then(() => showToast("Follow-up скопирован"));
                      }}
                    >
                      письмо
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setApps((prev) =>
                          prev.map((x) =>
                            x.id === a.id
                              ? pushEvent(
                                  {
                                    ...x,
                                    followUp: addDays(today(), profile.followDays),
                                    note: `${x.note ? `${x.note} · ` : ""}follow-up ${today()}`,
                                  },
                                  "followup",
                                  `follow-up ${today()}`,
                                )
                              : x,
                          ),
                        );
                        showToast("Сдвинули follow-up");
                      }}
                    >
                      отметил
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
