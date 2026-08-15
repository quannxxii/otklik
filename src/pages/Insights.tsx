import { useMemo } from "react";
import { useStore } from "../store";
import { STATUS_LABEL, STATUS_ORDER } from "../types";
import "./Insights.css";

export function InsightsPage() {
  const { apps } = useStore();

  const stats = useMemo(() => {
    const total = apps.length;
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<string, number>;
    apps.forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });

    const sentLike = apps.filter((a) => a.status !== "draft").length;
    const interviews = byStatus.interview + byStatus.offer;
    const offers = byStatus.offer;
    const rejects = byStatus.reject;

    const replyRate = sentLike ? Math.round(((byStatus.reply + interviews + rejects) / sentLike) * 100) : 0;
    const interviewRate = sentLike ? Math.round((interviews / sentLike) * 100) : 0;
    const offerRate = sentLike ? Math.round((offers / sentLike) * 100) : 0;

    const withScore = apps.filter((a) => a.fitScore != null);
    const avgFit = withScore.length
      ? Math.round(withScore.reduce((s, a) => s + (a.fitScore || 0), 0) / withScore.length)
      : null;

    const salaries = apps
      .map((a) => a.salary || "")
      .filter(Boolean);

    const byPlatform: Record<string, number> = {};
    apps.forEach((a) => {
      byPlatform[a.platform] = (byPlatform[a.platform] || 0) + 1;
    });

    const byReject: Record<string, number> = {};
    apps
      .filter((a) => a.status === "reject")
      .forEach((a) => {
        const key = a.rejectReason || "не указана";
        byReject[key] = (byReject[key] || 0) + 1;
      });

    const upcoming = apps.filter(
      (a) => a.interviewAt || a.testDeadline,
    ).length;

    return { total, byStatus, replyRate, interviewRate, offerRate, avgFit, salaries, byPlatform, sentLike, byReject, upcoming };
  }, [apps]);

  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className="insights">
      <div className="insights-head">
        <h2>Инсайты</h2>
        <p className="muted">Воронка поиска по твоим откликам. Чем честнее статусы — тем полезнее цифры.</p>
      </div>

      <div className="stats">
        <div className="stat"><b>{stats.total}</b><span className="mono">всего</span></div>
        <div className="stat"><b>{stats.replyRate}%</b><span className="mono">ответ/реакция</span></div>
        <div className="stat"><b>{stats.interviewRate}%</b><span className="mono">до собеса</span></div>
        <div className="stat"><b>{stats.offerRate}%</b><span className="mono">оффер</span></div>
        <div className="stat"><b>{stats.avgFit ?? "—"}{stats.avgFit != null ? "%" : ""}</b><span className="mono">avg match</span></div>
        <div className="stat"><b>{stats.upcoming}</b><span className="mono">собес/тест</span></div>
      </div>

      <div className="insights-grid">
        <section className="card">
          <h3>Воронка</h3>
          <div className="funnel">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="funnel-row">
                <span>{STATUS_LABEL[s]}</span>
                <div className="funnel-bar">
                  <i style={{ width: `${(stats.byStatus[s] / maxStatus) * 100}%` }} />
                </div>
                <b className="mono">{stats.byStatus[s]}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Площадки</h3>
          {!Object.keys(stats.byPlatform).length && <p className="muted">Пока пусто</p>}
          <ul className="plat-list">
            {Object.entries(stats.byPlatform)
              .sort((a, b) => b[1] - a[1])
              .map(([name, n]) => (
                <li key={name}>
                  <span>{name}</span>
                  <b className="mono">{n}</b>
                </li>
              ))}
          </ul>
        </section>

        <section className="card">
          <h3>Вилки</h3>
          {!stats.salaries.length ? (
            <p className="muted">Добавь вилку в карточке отклика — появится здесь.</p>
          ) : (
            <ul className="plat-list">
              {stats.salaries.slice(0, 12).map((s, i) => (
                <li key={`${s}-${i}`}>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3>Причины отказа</h3>
          {!Object.keys(stats.byReject).length ? (
            <p className="muted">Когда ставишь «отказ» — укажи причину в карточке.</p>
          ) : (
            <ul className="plat-list">
              {Object.entries(stats.byReject)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <li key={name}>
                    <span>{name}</span>
                    <b className="mono">{n}</b>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
