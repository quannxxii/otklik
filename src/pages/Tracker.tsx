import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import type { Application, Status } from "../types";
import { DEFAULT_PROFILE, DEFAULT_TEMPLATES, PLATFORMS, STATUS_LABEL, STATUS_ORDER } from "../types";
import {
  addDays,
  appsToCsv,
  copyText,
  downloadText,
  needsFollowUp,
  parseBackup,
  renderLetter,
  sanitizeApps,
  today,
  uid,
} from "../lib/storage";
import { stripProTemplates } from "../lib/pro";
import { analyzeVacancy, buildWeeklyDigest, heatmapDays, streakCount } from "../lib/match";
import { parseVacancy } from "../lib/parse";
import { event, weekItems, withStatusChange } from "../lib/crm";
import { DetailDrawer } from "../components/DetailDrawer";

export function TrackerPage() {
  const { apps, setApps, profile, setProfile, templates, setTemplates, showToast, isPro } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [view, setView] = useState<"table" | "kanban">(() =>
    params.get("view") === "kanban" ? "kanban" : "table",
  );
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paste, setPaste] = useState("");

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
    salary: "",
    city: "",
    stack: "",
    jdRaw: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const open = params.get("open");
    if (open) setSelectedId(open);
    if (params.get("view") === "kanban") setView("kanban");
  }, [params]);

  const goal = profile.dailyGoal || 5;
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

  function parsePasteIntoForm() {
    const raw = paste.trim();
    if (!raw) return;
    const parsed = parseVacancy(raw);
    const match = analyzeVacancy(raw, profile.skills, { isPro, hintStack: parsed.stack });
    setForm((f) => ({
      ...f,
      company: parsed.company || match.guessedCompany || f.company,
      role: parsed.role || match.guessedRole || f.role,
      platform: parsed.platform || f.platform,
      url: parsed.url || match.urls[0] || f.url,
      letterTpl: match.suggestedTpl,
      fitScore: match.score,
      note: match.matched.length ? `match ${match.score}% · ${match.matched.join(", ")}` : f.note,
      salary: parsed.salary || f.salary,
      city: parsed.city || f.city,
      stack: parsed.stack.join(", ") || f.stack,
      jdRaw: raw,
    }));
    showToast(match.score ? `Разобрано · match ${match.score}%` : "Разобрано");
  }

  function saveApp(copyLetter: boolean, openUrl = false) {
    const company = form.company.trim();
    const role = form.role.trim();
    if (!company || !role) return;

    let followUp = form.followUp;
    if (!followUp && form.status === "sent") followUp = addDays(form.date, profile.followDays);

    const prev = editId ? apps.find((a) => a.id === editId) : undefined;
    let payload: Application = {
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
      updatedAt: new Date().toISOString(),
      salary: form.salary || prev?.salary,
      city: form.city || prev?.city,
      stack: form.stack || prev?.stack,
      jdRaw: form.jdRaw || prev?.jdRaw,
      contact: prev?.contact,
      interviewNotes: prev?.interviewNotes,
      interviewAt: prev?.interviewAt,
      testDeadline: prev?.testDeadline,
      rejectReason: prev?.rejectReason,
      timeline: prev?.timeline,
    };

    if (!prev) {
      payload = {
        ...payload,
        timeline: [event(form.status === "sent" ? "sent" : "created", STATUS_LABEL[form.status])],
      };
    } else if (prev.status !== form.status) {
      payload = withStatusChange({ ...payload, status: prev.status }, form.status);
    }

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
        ).then(() => showToast(openUrl ? "Пакет: письмо скопировано, отклик записан" : "Сохранено и письмо скопировано"));
      }
    } else {
      showToast(editId ? "Сохранено" : "Отклик добавлен");
    }

    if (openUrl && payload.url) window.open(payload.url, "_blank", "noopener,noreferrer");

    setEditId(null);
    setPaste("");
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
      salary: app.salary || "",
      city: app.city || "",
      stack: app.stack || "",
      jdRaw: app.jdRaw || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selected = apps.find((a) => a.id === selectedId) || null;
  const agenda = useMemo(
    () => weekItems(apps, today()).items.filter((i) => i.date === today()),
    [apps],
  );

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

      {agenda.length > 0 && (
        <div className="card agenda">
          <b>Сегодня</b>
          {agenda.map((item) => (
            <button
              key={`${item.kind}-${item.app.id}`}
              type="button"
              className="agenda-item"
              onClick={() => setSelectedId(item.app.id)}
            >
              <span className="mono tiny">{item.label}</span>
              {item.app.company} · {item.app.role}
            </button>
          ))}
        </div>
      )}

      <form className="card form" onSubmit={onSubmit}>
        <div className="form-head">
          <h2>{editId ? "Редактирование" : "Новый отклик"}</h2>
          <button type="button" className="btn ghost" onClick={() => navigate("/app/radar")}>
            Сначала Radar →
          </button>
        </div>
        <div className="field paste-box">
          <label>Вставь вакансию целиком (hh / Хабр / LinkedIn)</label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Текст + ссылка. Браузер не скачает hh сам — нужен Ctrl+V."
          />
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn ghost" onClick={parsePasteIntoForm} disabled={!paste.trim()}>
              Разобрать в форму
            </button>
          </div>
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
        <div className="grid-4">
          <div className="field">
            <label>Вилка</label>
            <input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="от 180к net" />
          </div>
          <div className="field">
            <label>Город</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="field">
            <label>Стек</label>
            <input value={form.stack} onChange={(e) => setForm({ ...form, stack: e.target.value })} />
          </div>
          <div className="field">
            <label>Заметка {form.fitScore != null ? `· match ${form.fitScore}%` : ""}</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="контакт, детали" />
          </div>
        </div>
        <div className="actions">
          <button className="btn" type="submit">
            {editId ? "Сохранить" : "Добавить"}
          </button>
          <button className="btn ghost" type="button" onClick={() => saveApp(true)}>
            Добавить + письмо
          </button>
          <button className="btn accent" type="button" onClick={() => saveApp(true, true)}>
            Пакет: письмо + вкладка
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
                JSON.stringify({ version: 1, profile, templates: stripProTemplates(templates), apps }, null, 2),
                `otklik-backup-${today()}.json`,
                "application/json",
              );
              showToast("Бэкап скачан — храни файл, в браузере данные не бэкапятся сами");
            }}
          >
            Бэкап
          </button>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            Восстановить
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void file.text().then((raw) => {
                  try {
                    const data = parseBackup(raw);
                    const nextApps = sanitizeApps(data.apps);
                    const nextProfile = { ...DEFAULT_PROFILE, ...profile, ...(data.profile || {}) };
                    const nextTpl =
                      Array.isArray(data.templates) && data.templates.length
                        ? stripProTemplates(data.templates)
                        : DEFAULT_TEMPLATES;
                    if (!confirm(`Восстановить ${nextApps.length} откликов? Текущие данные заменятся.`)) return;
                    setApps(nextApps);
                    setProfile(nextProfile);
                    setTemplates(nextTpl);
                    showToast("Бэкап восстановлен");
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Битый JSON");
                  }
                });
              }}
            />
          </label>
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
              prev.map((a) => {
                if (a.id !== id) return a;
                let next = withStatusChange(a, status);
                if (status === "sent" && !next.followUp) {
                  next = { ...next, followUp: addDays(next.date || today(), profile.followDays) };
                }
                return next;
              }),
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

export function Kanban({
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
