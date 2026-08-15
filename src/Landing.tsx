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
      <div className="landing-bg" aria-hidden />
      <header className="landing-nav container">
        <Link to="/" className="logo">
          Отклик
        </Link>
        <div className="landing-nav-right">
          <a href="#demo">live demo</a>
          <a href="#why">зачем</a>
          <Link className="btn accent" to="/app">
            Открыть
          </Link>
        </div>
      </header>

      <section className="hero container">
        <p className="eyebrow mono">job search OS · без спама</p>
        <h1>
          Откликай
          <br />
          <span>умно.</span>
        </h1>
        <p className="hero-lead">
          Не рассылка «всем IT-компаниям». Система: вставил вакансию — пакетный отклик
          (письмо + вкладка + follow-up), CRM собесов и тестовых, неделя вперёд. Данные только в браузере.
        </p>
        <div className="hero-cta">
          <Link className="btn accent" to="/app/radar">
            Запустить Radar
          </Link>
          <Link className="btn ghost" to="/app">
            Сразу в трекер
          </Link>
        </div>
        <div className="hero-stats mono">
          <div>
            <b>0</b>
            <span>серверов с твоим резюме</span>
          </div>
          <div>
            <b>⌘K</b>
            <span>командная палитра</span>
          </div>
          <div>
            <b>28д</b>
            <span>heatmap активности</span>
          </div>
        </div>
      </section>

      <section id="demo" className="demo container">
        <div className="demo-copy">
          <p className="eyebrow mono">vacancy radar</p>
          <h2>Вставил текст вакансии — сразу видно, бить или нет</h2>
          <p className="muted">
            Локальный match score по стеку. Подсказывает шаблон письма и угадывает роль/компанию.
            Это и есть «вау»: меньше тупых откликов, больше попаданий.
          </p>
          <ul className="bullets">
            <li>Fit % и парсер вилки / города / стека</li>
            <li>Пакет: письмо, вкладка, follow-up</li>
            <li>CRM: собесы, тестовые, причины отказа</li>
            <li>Неделя + канбан + digest</li>
          </ul>
        </div>
        <div className="demo-panel">
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} aria-label="демо вакансия" />
          <div className="demo-score">
            <div className="score-ring" style={{ ["--p" as string]: `${result.score}%` }}>
              <strong>{result.score}</strong>
              <span>match</span>
            </div>
            <p>{result.verdict}</p>
            <div className="tag-row">
              {result.matched.slice(0, 6).map((m) => (
                <span key={m} className="tag ok">
                  {m}
                </span>
              ))}
            </div>
            <Link className="btn accent" to="/app/radar">
              Открыть полный Radar
            </Link>
          </div>
        </div>
      </section>

      <section id="why" className="strip container">
        <article>
          <h3>Не спам-пушка</h3>
          <p>Массовая рассылка убивает аккаунты и репутацию. Мы ускоряем точечные отклики.</p>
        </article>
        <article>
          <h3>Приватно по умолчанию</h3>
          <p>localStorage. Без регистрации. Экспорт CSV/JSON, если захочешь унести данные.</p>
        </article>
        <article>
          <h3>Ритм, не хаос</h3>
          <p>Цель на день, стрик, heatmap, календарь собесов на неделю, follow-up через N дней.</p>
        </article>
      </section>

      <section className="cta container">
        <h2>Хватит стрелять по воробьям.</h2>
        <p className="muted">Собери систему за 2 минуты. Дальше — только вакансии и Enter.</p>
        <Link className="btn accent" to="/app">
          Войти в Отклик
        </Link>
      </section>

      <footer className="landing-foot container">
        <span className="logo">Отклик</span>
        <span className="muted">Для людей, которые ищут работу как продукт, а не как лотерею.</span>
      </footer>
    </div>
  );
}
