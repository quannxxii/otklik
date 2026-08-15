import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SAMPLE_JD } from "./types";
import { analyzeVacancy } from "./lib/match";
import "./Landing.css";

const DEMO_SKILLS =
  "JavaScript, TypeScript, Vue, React, PHP, Flutter, Dart, Supabase, PostgreSQL, Next.js, Docker";

export function Landing() {
  const [jd, setJd] = useState(SAMPLE_JD);
  const result = useMemo(() => analyzeVacancy(jd, DEMO_SKILLS), [jd]);

  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden>
        <div className="radar-field">
          <i className="ring r1" />
          <i className="ring r2" />
          <i className="ring r3" />
          <i className="beam" />
          <i className="dot" />
        </div>
      </div>

      <header className="landing-nav container">
        <Link to="/" className="logo">
          Отклик
        </Link>
        <div className="landing-nav-right">
          <a href="#demo">Radar</a>
          <a href="#why">почему</a>
          <a href="#pricing">цены</a>
          <Link className="btn accent" to="/app">
            Открыть
          </Link>
        </div>
      </header>

      <section className="hero container">
        <p className="hero-brand">Отклик</p>
        <h1>Точечный поиск. Без спама.</h1>
        <p className="hero-lead">
          Вставил вакансию — письмо, follow-up и трекер за секунды. По умолчанию данные только в браузере.
          Свой ИИ-ключ — снимок поиска уходит к провайдеру API.
        </p>
        <div className="hero-cta">
          <Link className="btn accent" to="/app/radar">
            Запустить Radar
          </Link>
          <Link className="btn ghost" to="/app">
            В трекер
          </Link>
        </div>
      </section>

      <section id="demo" className="demo container">
        <div className="demo-copy">
          <p className="eyebrow mono">vacancy radar</p>
          <h2>Вставил текст — сразу видно, бить или нет</h2>
          <p className="muted">
            Match по стеку, пакетный отклик, коуч и расширение для hh. Не рассылка «всем IT» — система.
          </p>
        </div>
        <div className="demo-stage">
          <label className="mono tiny" htmlFor="demo-jd">
            текст вакансии
          </label>
          <textarea
            id="demo-jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            aria-label="демо вакансия"
          />
          <div className="demo-score">
            <div className="score-ring" style={{ ["--p" as string]: `${result.score}%` }}>
              <span className="score-ring-label">
                <strong>{result.score}</strong>
                <span>match</span>
              </span>
            </div>
            <div className="demo-score-copy">
              <p>{result.verdict}</p>
              <div className="tag-row">
                {result.matched.slice(0, 6).map((m) => (
                  <span key={m} className="tag ok">
                    {m}
                  </span>
                ))}
              </div>
              <Link className="btn accent" to="/app/radar">
                Полный Radar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="why container">
        <p className="eyebrow mono">принципы</p>
        <div className="why-grid">
          <article>
            <h3>Не спам-пушка</h3>
            <p>Ускоряем точечные отклики. Массовая рассылка убивает аккаунты.</p>
          </article>
          <article>
            <h3>Приватно по умолчанию</h3>
            <p>
              localStorage, без аккаунта. Скачай JSON-бэкап — иначе смена браузера сотрёт воронку.
              ИИ включаешь сам: тогда данные уезжают на твой API.
            </p>
          </article>
          <article>
            <h3>Ритм, не хаос</h3>
            <p>Цель на день, стрик, коуч, follow-up и неделя собесов.</p>
          </article>
        </div>
      </section>

      <section id="pricing" className="pricing container">
        <p className="eyebrow mono">цены</p>
        <h2>Бесплатно пользоваться. Pro — письма и ритм.</h2>
        <p className="muted pricing-lead">
          Трекер и Radar без оплаты. Pro разово: шаблоны в Radar и письмах, пакет follow-up, план коуча в буфер.
          Продукт в браузере — не созвоны. Ключ живёт в этом Chrome; храни бэкап.
        </p>
        <div className="pricing-grid">
          <article>
            <p className="mono tiny">free</p>
            <h3>Отклик</h3>
            <p className="pro-price">0 ₽</p>
            <ul>
              <li>Radar, трекер, канбан</li>
              <li>Follow-up по одному</li>
              <li>Локальный коуч на экране</li>
              <li>Расширение hh / Хабр</li>
            </ul>
            <Link className="btn ghost" to="/app">
              Начать
            </Link>
          </article>
          <article className="featured">
            <p className="mono tiny">разово · навсегда</p>
            <h3>Pro</h3>
            <p className="pro-price">990 ₽</p>
            <ul>
              <li>Пять шаблонов под ситуацию</li>
              <li>Все follow-up письма сразу в буфер</li>
              <li>Разбор коуча + ритм недели — копируются</li>
              <li>Ключ в Telegram, живёт в этом браузере</li>
            </ul>
            <Link className="btn accent" to="/app/pro">
              Купить Pro
            </Link>
          </article>
        </div>
      </section>

      <section className="cta container">
        <h2>Хватит стрелять по воробьям.</h2>
        <p className="muted">Собери систему за две минуты. Дальше — только вакансии.</p>
        <Link className="btn accent" to="/app">
          Войти в Отклик
        </Link>
      </section>

      <footer className="landing-foot container">
        <span className="logo">Отклик</span>
        <span className="muted">Поиск работы как продукт, не лотерея.</span>
        <Link className="muted" to="/app/pro">
          Pro · 990 ₽
        </Link>
      </footer>
    </div>
  );
}
