import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { DEFAULT_PROFILE, DEFAULT_TEMPLATES } from "../types";
import { downloadText, parseBackup, sanitizeApps, today } from "../lib/storage";
import { stripProTemplates } from "../lib/pro";
import { clearAiSettings, DEFAULT_AI, loadAiSettings, pingAi, saveAiSettings, type AiSettings } from "../lib/llm";
import { ExtSyncBadge } from "../components/ExtSyncBadge";

export function SettingsPage() {
  const { profile, setProfile, apps, setApps, templates, setTemplates, showToast, extSync } = useStore();
  const [form, setForm] = useState(profile);
  const [ai, setAi] = useState<AiSettings>(() => loadAiSettings());
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => setForm(profile), [profile]);

  return (
    <div>
    <div className="card" style={{ marginBottom: 12 }}>
      <h2>Бэкап</h2>
      <p className="tiny">
        Данные только в этом браузере. Скачай JSON и храни файл — при очистке Chrome всё пропадёт.
      </p>
      <div className="actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn accent"
          onClick={() => {
            downloadText(
              JSON.stringify({ version: 1, profile, templates: stripProTemplates(templates), apps }, null, 2),
              `otklik-backup-${today()}.json`,
              "application/json",
            );
            showToast("Бэкап скачан");
          }}
        >
          Скачать бэкап
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
                  const nextProfile = { ...DEFAULT_PROFILE, ...(data.profile || {}), onboardingDone: true };
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
    </div>
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
            onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 5 })}
          />
          <p className="tiny muted" style={{ marginTop: 4 }}>
            Точечных откликов, не спам. По умолчанию 5.
          </p>
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
        <Link className="btn accent" to="/app/pro">
          Pro / оплата
        </Link>
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

    <div className="card" style={{ marginTop: 12 }}>
      <h2>Расширение Chrome / Edge</h2>
      <ExtSyncBadge status={extSync} />
      <p className="tiny">
        На странице вакансии hh.ru и Хабр Карьеры — кнопка «О»: match, письмо в буфер, запись в трекер.
        «Откликнуться» на площадке жмёшь сам. Авторассылки нет.
      </p>
      <ol className="tiny" style={{ margin: "10px 0 0 18px", display: "grid", gap: 6 }}>
        <li>chrome://extensions → режим разработчика</li>
        <li>Загрузить распакованное → папка <code>extension</code> в репозитории Отклик</li>
        <li>Эта вкладка должна быть открыта хотя бы раз — иначе синк пустой</li>
        <li>Пакет → отправь на hh сам → «Отправил — отметить»</li>
      </ol>
      <div className="actions">
        <a className="btn ghost" href="https://github.com/quannxxii/otklik/tree/main/extension" target="_blank" rel="noreferrer">
          Папка на GitHub
        </a>
      </div>
    </div>

    <div className="card" style={{ marginTop: 12 }}>
      <h2>ИИ-коуч</h2>
      <p className="tiny">
        Свой ключ OpenAI-совместимого API. Хранится только здесь, не попадает в CSV/JSON бэкап.
        При «Углубить с ИИ» на указанный URL уходит снимок: имя, стек, до 30 откликов и кусок JD.
        Без ключа коуч работает локально и никуда не шлёт данные.
      </p>
      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>API key</label>
          <input
            type="password"
            autoComplete="off"
            value={ai.apiKey}
            onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
            placeholder="sk-…"
          />
        </div>
        <div className="field">
          <label>Base URL</label>
          <input
            value={ai.baseUrl}
            onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
            placeholder={DEFAULT_AI.baseUrl}
          />
        </div>
        <div className="field">
          <label>Модель</label>
          <input
            value={ai.model}
            onChange={(e) => setAi({ ...ai, model: e.target.value })}
            placeholder={DEFAULT_AI.model}
          />
        </div>
      </div>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            saveAiSettings(ai);
            showToast("Ключ сохранён локально");
          }}
        >
          Сохранить ключ
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={aiBusy || !ai.apiKey.trim()}
          onClick={() => {
            saveAiSettings(ai);
            setAiBusy(true);
            void pingAi(ai)
              .then((headline) => showToast(headline || "Ок, модель отвечает"))
              .catch((e) => showToast(e instanceof Error ? e.message : "Пинг не прошёл"))
              .finally(() => setAiBusy(false));
          }}
        >
          {aiBusy ? "Проверяю…" : "Проверить"}
        </button>
        <button
          className="btn danger"
          type="button"
          onClick={() => {
            clearAiSettings();
            setAi({ ...DEFAULT_AI });
            showToast("Ключ удалён");
          }}
        >
          Удалить ключ
        </button>
      </div>
    </div>
    </div>
  );
}

