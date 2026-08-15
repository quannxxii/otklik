import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { addDays, appsToCsv, copyText, downloadText, needsFollowUp, renderLetter, today } from "../lib/storage";
import { stripProTemplates } from "../lib/pro";
import { pushEvent } from "../lib/crm";
import { streakCount } from "../lib/match";
import "./Today.css";

const BACKUP_HINT_KEY = "otklik-backup-hint-v1";

export function TodayPage() {
  const { apps, setApps, profile, templates, showToast } = useStore();
  const navigate = useNavigate();
  const now = today();
  const goal = profile.dailyGoal || 5;
  const todaySent = apps.filter((a) => a.date === now && a.status !== "draft").length;
  const streak = streakCount(apps);
  const goalPct = Math.min(100, Math.round((todaySent / goal) * 100));
  const isEmpty = apps.length === 0;
  const [backupDismissed, setBackupDismissed] = useState(() => Boolean(sessionStorage.getItem(BACKUP_HINT_KEY)));

  const follow = useMemo(
    () =>
      apps
        .filter((a) => needsFollowUp(a, profile.followDays))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    [apps, profile.followDays],
  );

  const drafts = useMemo(
    () =>
      apps
        .filter((a) => a.status === "draft")
        .sort((a, b) => (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date))
        .slice(0, 4),
    [apps],
  );

  const agenda = useMemo(() => {
    return apps
      .filter((a) => {
        const interviewDay = a.interviewAt?.slice(0, 10);
        return interviewDay === now || a.testDeadline === now;
      })
      .slice(0, 5);
  }, [apps, now]);

  const followTpl = templates.find((t) => t.id === "followup") || templates[templates.length - 1];
  const name = profile.name?.trim() || "ты";
  const showBackupHint = apps.length >= 3 && !backupDismissed;

  function dismissBackupHint() {
    sessionStorage.setItem(BACKUP_HINT_KEY, "1");
    setBackupDismissed(true);
  }

  function downloadBackup() {
    downloadText(
      JSON.stringify({ version: 1, apps, profile, templates: stripProTemplates(templates), exportedAt: new Date().toISOString() }, null, 2),
      `otklik-backup-${now}.json`,
      "application/json",
    );
    sessionStorage.setItem(BACKUP_HINT_KEY, "1");
    setBackupDismissed(true);
    showToast("Бэкап скачан — храни файл вне браузера");
  }

  if (isEmpty) {
    return (
      <div className="today">
        <header className="today-head">
          <div>
            <p className="mono eyebrow">сегодня</p>
            <h2>
              {greeting()}, {name.split(" ")[0]}
            </h2>
            <p className="muted">Один следующий шаг — первая вакансия. Цель {goal} точечных, не спам.</p>
          </div>
        </header>

        <section className="today-start">
          <p className="mono tiny today-start-kicker">с чего начать</p>
          <h3>Вставь вакансию — письмо и трекер за минуту</h3>
          <p className="muted">
            Radar разберёт стек и соберёт письмо. На hh можно тем же циклом через расширение: пакет → отправь сам →
            «Отправил».
          </p>
          <ol className="today-steps">
            <li>
              <b>1.</b> Вставь текст или ссылку в Radar
            </li>
            <li>
              <b>2.</b> Скопируй письмо и откликнись на площадке сам
            </li>
            <li>
              <b>3.</b> Вернись сюда и отметь «отправил»
            </li>
          </ol>
          <div className="today-cta">
            <Link className="btn accent" to="/app/radar">
              Вставить первую вакансию
            </Link>
            <Link className="btn ghost" to="/app/tracker">
              Трекер вручную
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <p className="mono eyebrow">сегодня</p>
          <h2>
            {greeting()}, {name.split(" ")[0]}
          </h2>
          <p className="muted">
            Цель {goal} точечных · сделано {todaySent}
            {streak > 0 ? ` · стрик ${streak}д` : ""}
          </p>
        </div>
        <div className="today-cta">
          <Link className="btn accent" to="/app/radar">
            Вставить вакансию
          </Link>
          <Link className="btn ghost" to="/app/tracker">
            Трекер
          </Link>
        </div>
      </header>

      {showBackupHint && (
        <div className="today-backup">
          <p>
            Уже {apps.length} записей в браузере. Скачай бэкап — при очистке Chrome данные пропадут.
          </p>
          <div className="today-cta">
            <button type="button" className="btn accent" onClick={downloadBackup}>
              Скачать бэкап
            </button>
            <button type="button" className="btn ghost" onClick={dismissBackupHint}>
              Позже
            </button>
          </div>
        </div>
      )}

      <div className="today-goal">
        <div className="today-goal-top">
          <span className="mono tiny">прогресс дня · точечные, не спам</span>
          <b>
            {todaySent}/{goal}
          </b>
        </div>
        <div className="today-bar" aria-hidden>
          <i style={{ width: `${goalPct}%` }} />
        </div>
        <p className="tiny">
          {todaySent >= goal
            ? "Цель закрыта. Можно follow-up или отдых."
            : drafts.length
              ? `Есть черновики — добей отправку на площадке, потом отметь.`
              : `Ещё ${goal - todaySent} точечных — лучше через Radar.`}
        </p>
      </div>

      <div className={`today-grid${agenda.length ? "" : " today-grid-2"}`}>
        <section className="today-block">
          <div className="today-block-head">
            <h3>Follow-up</h3>
            <Link className="tiny" to="/app/follow">
              все →
            </Link>
          </div>
          {!follow.length && <p className="muted tiny">Пока некого догонять.</p>}
          <ul className="today-list">
            {follow.map((a) => (
              <li key={a.id}>
                <button type="button" className="today-row" onClick={() => navigate(`/app/tracker?open=${a.id}`)}>
                  <b>{a.company}</b>
                  <span>{a.role}</span>
                </button>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      if (!followTpl) return;
                      void copyText(
                        renderLetter(followTpl.body, {
                          company: a.company,
                          vacancy: a.role,
                          profile,
                        }),
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
                                  followUp: addDays(now, profile.followDays),
                                  note: `${x.note ? `${x.note} · ` : ""}follow-up ${now}`,
                                },
                                "followup",
                                `follow-up ${now}`,
                              )
                            : x,
                        ),
                      );
                      showToast(`Follow-up сдвинут на ${profile.followDays}д`);
                    }}
                  >
                    +{profile.followDays}д
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="today-block today-block-focus">
          <div className="today-block-head">
            <h3>Черновики</h3>
            <span className="tiny muted">отправь на площадке</span>
          </div>
          {!drafts.length && (
            <p className="muted tiny">
              Пусто. <Link to="/app/radar">Radar</Link> или расширение на hh.
            </p>
          )}
          <ul className="today-list">
            {drafts.map((a) => (
              <li key={a.id}>
                <button type="button" className="today-row" onClick={() => navigate(`/app/tracker?open=${a.id}`)}>
                  <b>{a.company}</b>
                  <span>{a.role}</span>
                </button>
                <div className="row-actions">
                  {a.url ? (
                    <a className="btn accent" href={a.url} target="_blank" rel="noreferrer">
                      открыть hh
                    </a>
                  ) : (
                    <Link className="btn ghost" to="/app/radar">
                      письмо
                    </Link>
                  )}
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
                                  status: "sent",
                                  followUp: x.followUp || addDays(now, profile.followDays),
                                },
                                "sent",
                                "отметил отправку",
                              )
                            : x,
                        ),
                      );
                      showToast("Статус: отправлено");
                    }}
                  >
                    отметил отправку
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {agenda.length > 0 && (
          <section className="today-block">
            <div className="today-block-head">
              <h3>События</h3>
              <Link className="tiny" to="/app/week">
                неделя →
              </Link>
            </div>
            <ul className="today-list">
              {agenda.map((a) => (
                <li key={a.id}>
                  <button type="button" className="today-row" onClick={() => navigate(`/app/tracker?open=${a.id}`)}>
                    <b>{a.company}</b>
                    <span>
                      {a.interviewAt?.slice(0, 10) === now ? "собес" : "тестовое"} · {a.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="today-foot tiny muted">
        CSV:{" "}
        <button
          type="button"
          className="linkish"
          onClick={() => {
            downloadText(appsToCsv(apps), `otklik-${now}.csv`, "text/csv;charset=utf-8");
            showToast("CSV скачан");
          }}
        >
          экспорт
        </button>
        {" · "}
        <button type="button" className="linkish" onClick={downloadBackup}>
          бэкап JSON
        </button>
      </p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}
