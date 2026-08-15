import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import type { Application, Status } from "./types";
import { PLATFORMS, STATUS_LABEL, STATUS_ORDER } from "./types";
import {
  addDays,
  appsToCsv,
  copyText,
  daysBetween,
  downloadText,
  needsFollowUp,
  renderLetter,
  today,
  uid,
} from "./lib/storage";
import { buildWeeklyDigest, heatmapDays, streakCount } from "./lib/match";
import { maybeNotifyFollowUps } from "./lib/notify";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { DetailDrawer } from "./components/DetailDrawer";
import { RadarPage } from "./pages/Radar";
import { InsightsPage } from "./pages/Insights";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const { toast, profile, setProfile, apps, showToast } = useStore();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    maybeNotifyFollowUps(apps, profile.followDays, profile.notifyFollowUps);
  }, [apps, profile.followDays, profile.notifyFollowUps]);

  const cmdItems = [
    { id: "radar", label: "Vacancy Radar", hint: "матч по вакансии", run: () => navigate("/app/radar") },
    { id: "track", label: "Трекер", hint: "таблица", run: () => navigate("/app") },
    { id: "insights", label: "Инсайты", hint: "воронка", run: () => navigate("/app/insights") },
    { id: "board", label: "Канбан", hint: "pipeline", run: () => navigate("/app?view=kanban") },
    { id: "follow", label: "Follow-up", hint: "кто молчит", run: () => navigate("/app/follow") },
    { id: "letters", label: "Письма", run: () => navigate("/app/letters") },
    { id: "settings", label: "Профиль", run: () => navigate("/app/settings") },
    {
      id: "digest",
      label: "Недельный отчёт",
      hint: "скопировать",
      run: () => {
        void copyText(buildWeeklyDigest(apps, profile.name)).then(() => showToast("Отчёт скопирован"));
      },
    },
  ];

  return (
    <div className="app-shell">
      {!profile.onboardingDone && (
        <Onboarding profile={profile} onDone={(p) => { setProfile(p); showToast("Профиль готов"); }} />
      )}

      <header className="app-header">
        <div className="container app-header-inner">
          <Link to="/" className="logo">Отклик</Link>
          <nav className="app-nav">
            <NavLink to="/app" end>Трекер</NavLink>
            <NavLink to="/app/radar">Radar</NavLink>
            <NavLink to="/app/follow">Follow-up</NavLink>
            <NavLink to="/app/insights">Инсайты</NavLink>
            <NavLink to="/app/letters">Письма</NavLink>
            <NavLink to="/app/settings">Профиль</NavLink>
          </nav>
          <button type="button" className="btn ghost cmd-btn" onClick={() => setCmdOpen(true)}>
            ⌘K
          </button>
        </div>
      </header>

      <main className="container app-main">
        <Routes>
          <Route index element={<TrackerPage />} />
          <Route path="radar" element={<RadarPage />} />
          <Route path="follow" element={<FollowPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="letters" element={<LettersPage />} />
          <Route path="platforms" element={<PlatformsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={cmdItems} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TrackerPage() {
  const { apps, setApps, profile, templates, showToast } = useStore();
  const navigate = useNavigate();
  const [view, setView] = useState<"table" | "kanban">(() =>
    new URLSearchParams(window.location.search).get("view") === "kanban" ? "kanban" : "table",
  );
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const emptyForm = {
    company: "",
    role: "",
    platform: "hh.ru",
    status: "sent" as Status,
    url: "",
    date: today(),
    followUp: addDays(today(), profile.followDays),
    note: "",
    letterTpl: templates[0]?.id || "fullstack",
    fitScore: undefined as number | undefined,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const raw = sessionStorage.getItem("otklik-radar-draft");
    if (!raw) return;
    sessionStorage.removeItem("otklik-radar-draft");
    try {
      const d = JSON.parse(raw) as {
        company: string;
        role: string;
        url: string;
        letterTpl: string;
        fitScore: number;
        matched: string;
      };
      setForm((f) => ({
        ...f,
        company: d.company,
        role: d.role,
        url: d.url,
        letterTpl: d.letterTpl,
        fitScore: d.fitScore,
        note: d.matched ? `match ${d.fitScore}% · ${d.matched}` : f.note,
        status: "draft",
      }));
      showToast("Черновик из Radar");
    } catch {
      /* ignore */
    }
  }, [showToast]);

  const goal = profile.dailyGoal || 10;
  const todayCount = apps.filter((a) => a.date === today() && a.status !== "draft").length;
  const streak = streakCount(apps);
  const heat = heatmapDays(apps, 28);

  const counts = {
    all: apps.length,
    sent: apps.filter((a) => a.status === "sent").length,
    follow: apps.filter((a) => needsFollowUp(a, profile.followDays)).length,
    interview: apps.filter((a) => a.status === "interview").length,
    offer: apps.filter((a) => a.status === "offer").length,
    reject: apps.filter((a) => a.status === "reject").length,
  };

  const filtered = useMemo(() => {
    let list = [...apps];
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((a) =>
        [a.company, a.role, a.note, a.platform, a.url].join(" ").toLowerCase().includes(query),
      );
    }
    if (fStatus === "follow") list = list.filter((a) => needsFollowUp(a, profile.followDays));
    else if (fStatus) list = list.filter((a) => a.status === fStatus);
    if (fPlatform) list = list.filter((a) => a.platform === fPlatform);
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [apps, q, fStatus, fPlatform, profile.followDays]);

  function saveApp(copyLetter: boolean) {
    const company = form.company.trim();
    const role = form.role.trim();
    if (!company || !role) return;

    let followUp = form.followUp;
    if (!followUp && form.status === "sent") followUp = addDays(form.date, profile.followDays);

    const payload: Application = {
      id: editId || uid(),
      company,
      role,
      platform: form.platform,
      status: form.status,
      url: form.url.trim(),
      date: form.date,
      followUp,
      note: form.note.trim(),
      letterTpl: form.letterTpl,
      updatedAt: today(),
      fitScore: form.fitScore,
    };

    if (!editId) {
      const dup = apps.find(
        (a) =>
          a.company.toLowerCase() === company.toLowerCase() &&
          ((payload.url && a.url === payload.url) ||
            (!payload.url && a.role.toLowerCase() === role.toLowerCase() && a.date === payload.date)),
      );
      if (dup) {
        showToast("Похожий отклик уже есть");
        return;
      }
      setApps((prev) => [...prev, payload]);
    } else {
      setApps((prev) => prev.map((a) => (a.id === editId ? payload : a)));
    }

    if (copyLetter) {
      const tpl = templates.find((t) => t.id === payload.letterTpl) || templates[0];
      if (tpl) {
        void copyText(
          renderLetter(tpl.body, {
            company,
            vacancy: role,
            profile,
            matched: payload.note.includes("·") ? payload.note.split("·")[1]?.trim() : undefined,
          }),
        ).then(() => showToast("Сохранено и письмо скопировано"));
      }
    } else {
      showToast(editId ? "Сохранено" : "Отклик добавлен");
    }

    setEditId(null);
    setForm({ ...emptyForm, date: today(), followUp: addDays(today(), profile.followDays) });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveApp(false);
  }

  function startEdit(app: Application) {
    setEditId(app.id);
    setForm({
      company: app.company,
      role: app.role,
      platform: app.platform,
      status: app.status,
      url: app.url,
      date: app.date,
      followUp: app.followUp,
      note: app.note,
      letterTpl: app.letterTpl,
      fitScore: app.fitScore,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selected = apps.find((a) => a.id === selectedId) || null;

  return (
    <div>
      <DetailDrawer
        app={selected}
        onClose={() => setSelectedId(null)}
        onChange={(next) => {
          setApps((prev) => prev.map((a) => (a.id === next.id ? { ...next, updatedAt: today() } : a)));
        }}
        onDelete={(id) => {
          setApps((prev) => prev.filter((a) => a.id !== id));
          setSelectedId(null);
          showToast("Удалено");
        }}
      />
      <div className="pulse-row">
        <div className="goal card">
          <div>
            <strong>Сегодня:</strong> {todayCount} / {goal}
            <span className="muted"> · стрик {streak} дн.</span>
          </div>
          <div className="goal-bar">
            <i style={{ width: `${Math.min(100, Math.round((todayCount / goal) * 100))}%` }} />
          </div>
        </div>
        <div className="card heat-card">
          <div className="heat-top">
            <span className="mono">28 дней</span>
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                void copyText(buildWeeklyDigest(apps, profile.name)).then(() => showToast("Недельный отчёт скопирован"))
              }
            >
              Digest
            </button>
          </div>
          <div className="heatmap" title="Активность откликов">
            {heat.map((d) => (
              <i
                key={d.date}
                className={`h${Math.min(4, d.count)}`}
                title={`${d.date}: ${d.count}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="stats">
        {[
          ["", counts.all, "всего"],
          ["sent", counts.sent, "ждут"],
          ["follow", counts.follow, "follow-up"],
          ["interview", counts.interview, "собесы"],
          ["offer", counts.offer, "офферы"],
          ["reject", counts.reject, "отказы"],
        ].map(([st, n, label]) => (
          <button
            key={label}
            type="button"
            className={`stat ${fStatus === st ? "on" : ""}`}
            onClick={() => setFStatus(fStatus === st ? "" : String(st))}
          >
            <b>{n}</b>
            <span className="mono">{label}</span>
          </button>
        ))}
      </div>

      <form className="card form" onSubmit={onSubmit}>
        <div className="form-head">
          <h2>{editId ? "Редактирование" : "Новый отклик"}</h2>
          <button type="button" className="btn ghost" onClick={() => navigate("/app/radar")}>
            Сначала Radar →
          </button>
        </div>
        <div className="grid-4">
          <div className="field">
            <label>Компания *</label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
          </div>
          <div className="field">
            <label>Вакансия *</label>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
          </div>
          <div className="field">
            <label>Площадка</label>
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Статус</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-4">
          <div className="field">
            <label>Ссылка</label>
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
          </div>
          <div className="field">
            <label>Дата</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="field">
            <label>Follow-up</label>
            <input type="date" value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} />
          </div>
          <div className="field">
            <label>Шаблон</label>
            <select value={form.letterTpl} onChange={(e) => setForm({ ...form, letterTpl: e.target.value })}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Заметка {form.fitScore != null ? `· match ${form.fitScore}%` : ""}</label>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="стек, вилка, контакт" />
        </div>
        <div className="actions">
          <button className="btn" type="submit">
            {editId ? "Сохранить" : "Добавить"}
          </button>
          <button className="btn ghost" type="button" onClick={() => saveApp(true)}>
            Добавить + письмо
          </button>
          {editId && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              Отмена
            </button>
          )}
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              downloadText(appsToCsv(apps), `otklik-${today()}.csv`, "text/csv;charset=utf-8");
              showToast("CSV");
            }}
          >
            CSV
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              downloadText(
                JSON.stringify({ profile, templates, apps }, null, 2),
                `otklik-backup-${today()}.json`,
                "application/json",
              );
              showToast("Бэкап");
            }}
          >
            Бэкап
          </button>
        </div>
      </form>

      <div className="card filters">
        <div className="grid-4">
          <div className="field">
            <label>Поиск</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="компания, роль…" />
          </div>
          <div className="field">
            <label>Статус</label>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">все</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
              <option value="follow">нужен follow-up</option>
            </select>
          </div>
          <div className="field">
            <label>Площадка</label>
            <select value={fPlatform} onChange={(e) => setFPlatform(e.target.value)}>
              <option value="">все</option>
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Вид</label>
            <div className="view-toggle">
              <button type="button" className={`btn ${view === "table" ? "" : "ghost"}`} onClick={() => setView("table")}>
                Таблица
              </button>
              <button type="button" className={`btn ${view === "kanban" ? "" : "ghost"}`} onClick={() => setView("kanban")}>
                Канбан
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <Kanban
          apps={filtered}
          onStatus={(id, status) => {
            setApps((prev) =>
              prev.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      status,
                      updatedAt: today(),
                      followUp:
                        status === "sent" && !a.followUp ? addDays(a.date || today(), profile.followDays) : a.followUp,
                    }
                  : a,
              ),
            );
          }}
          onEdit={startEdit}
        />
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Компания</th>
                <th>Роль</th>
                <th>Где</th>
                <th>Match</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="empty">
                    Пусто. Открой Radar и вставь первую вакансию.
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className={needsFollowUp(a, profile.followDays) ? "follow" : ""}>
                  <td>{a.date}</td>
                  <td>
                    <b>{a.company}</b>
                    {a.note && <div className="tiny">{a.note}</div>}
                    {a.url && (
                      <div className="tiny">
                        <a href={a.url} target="_blank" rel="noreferrer">
                          вакансия
                        </a>
                      </div>
                    )}
                  </td>
                  <td>{a.role}</td>
                  <td>{a.platform}</td>
                  <td>{a.fitScore != null ? `${a.fitScore}%` : "—"}</td>
                  <td>
                    <span className={`pill ${a.status}`}>{STATUS_LABEL[a.status]}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn ghost" onClick={() => setSelectedId(a.id)}>
                        карточка
                      </button>
                      <button type="button" className="btn ghost" onClick={() => startEdit(a)}>
                        правка
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          const tpl = templates.find((t) => t.id === a.letterTpl) || templates[0];
                          if (!tpl) return;
                          void copyText(
                            renderLetter(tpl.body, { company: a.company, vacancy: a.role, profile }),
                          ).then(() => showToast("Письмо скопировано"));
                        }}
                      >
                        письмо
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          if (!confirm(`Удалить ${a.company}?`)) return;
                          setApps((prev) => prev.filter((x) => x.id !== a.id));
                          showToast("Удалено");
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kanban({
  apps,
  onStatus,
  onEdit,
}: {
  apps: Application[];
  onStatus: (id: string, status: Status) => void;
  onEdit: (app: Application) => void;
}) {
  return (
    <div className="kanban">
      {STATUS_ORDER.map((status) => {
        const col = apps.filter((a) => a.status === status);
        return (
          <section key={status} className="kanban-col">
            <header>
              <span>{STATUS_LABEL[status]}</span>
              <b className="mono">{col.length}</b>
            </header>
            <div className="kanban-list">
              {col.map((a) => (
                <article key={a.id} className="kanban-card">
                  <button type="button" className="kanban-title" onClick={() => onEdit(a)}>
                    <b>{a.company}</b>
                    <span>{a.role}</span>
                    {a.fitScore != null && <em className="mono">{a.fitScore}%</em>}
                  </button>
                  <select
                    value={a.status}
                    onChange={(e) => onStatus(a.id, e.target.value as Status)}
                    aria-label="статус"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FollowPage() {
  const { apps, setApps, profile, templates, showToast } = useStore();
  const list = apps
    .filter((a) => needsFollowUp(a, profile.followDays))
    .sort((a, b) => a.date.localeCompare(b.date));
  const followTpl = templates.find((t) => t.id === "followup") || templates[templates.length - 1];

  return (
    <div className="card">
      <h2>Кому написать сегодня</h2>
      <p className="tiny">{list.length ? `Ждут follow-up: ${list.length}` : "Пока некого догонять."}</p>
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
                              ? {
                                  ...x,
                                  followUp: addDays(today(), profile.followDays),
                                  note: `${x.note ? `${x.note} · ` : ""}follow-up ${today()}`,
                                  updatedAt: today(),
                                }
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

function LettersPage() {
  const { profile, templates, setTemplates, apps, showToast } = useStore();
  const [tplId, setTplId] = useState(templates[0]?.id || "");
  const [company, setCompany] = useState("");
  const [vacancy, setVacancy] = useState("");
  const current = templates.find((t) => t.id === tplId) || templates[0];
  const text = current ? renderLetter(current.body, { company, vacancy, profile }) : "";

  return (
    <div className="card">
      <h2>Сопроводительные</h2>
      <p className="tiny">
        {"{{name}} {{role}} {{city}} {{company}} {{vacancy}} {{matched}} {{links}}"}
      </p>
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

function PlatformsPage() {
  const { platformsDone, setPlatformDone } = useStore();
  const links = [
    { id: "hh", name: "hh.ru", url: "https://hh.ru", tip: "8–12 точечных откликов в день" },
    { id: "habr", name: "Хабр Карьера", url: "https://career.habr.com", tip: "Часто живее hh" },
    { id: "li", name: "LinkedIn", url: "https://www.linkedin.com/jobs/", tip: "Easy Apply точечно" },
    { id: "getmatch", name: "GetMatch", url: "https://getmatch.ru", tip: "Подбор под стек" },
    { id: "tg", name: "Telegram", url: "https://t.me", tip: "Коротко и по делу" },
  ];
  return (
    <div className="card">
      <h2>Площадки</h2>
      <ul className="check">
        {links.map((p) => (
          <li key={p.id}>
            <input
              type="checkbox"
              checked={!!platformsDone[p.id]}
              onChange={(e) => setPlatformDone(p.id, e.target.checked)}
            />
            <div>
              <b>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.name}
                </a>
              </b>
              <div className="tiny">{p.tip}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPage() {
  const { profile, setProfile, setApps, showToast } = useStore();
  const [form, setForm] = useState(profile);

  useEffect(() => setForm(profile), [profile]);

  return (
    <div className="card">
      <h2>Профиль</h2>
      <p className="tiny">Стек нужен Radar’у. Всё только в вашем браузере.</p>
      <div className="grid-2" style={{ marginTop: 12 }}>
        {(
          [
            ["name", "Имя"],
            ["role", "Роль"],
            ["city", "Город"],
            ["email", "Email"],
            ["telegram", "Telegram"],
            ["github", "GitHub"],
            ["portfolio", "Портфолио"],
          ] as const
        ).map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Стек (через запятую)</label>
          <input
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder="Vue, PHP, Flutter, React…"
          />
        </div>
        <div className="field">
          <label>Цель / день</label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.dailyGoal}
            onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 10 })}
          />
        </div>
        <div className="field">
          <label>Follow-up через (дней)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={form.followDays}
            onChange={(e) => setForm({ ...form, followDays: Number(e.target.value) || 5 })}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="checkline" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={form.notifyFollowUps}
              onChange={(e) => setForm({ ...form, notifyFollowUps: e.target.checked })}
            />
            Напоминания о follow-up в браузере
          </label>
        </div>
      </div>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            setProfile({ ...form, onboardingDone: true });
            showToast("Профиль сохранён");
          }}
        >
          Сохранить
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setProfile({ ...form, onboardingDone: false });
            showToast("Онбординг снова");
          }}
        >
          Пройти онбординг заново
        </button>
        <button
          className="btn danger"
          type="button"
          onClick={() => {
            if (!confirm("Удалить все отклики?")) return;
            setApps([]);
            showToast("Очищено");
          }}
        >
          Очистить отклики
        </button>
      </div>
    </div>
  );
}
