import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import {
  FREE_PERKS,
  PRO_PERKS,
  PRO_PRICE,
  TG_URL,
  WEEK_RHYTHM,
  activateProKey,
  clearPro,
  mintProKey,
  telegramPayLink,
} from "../lib/pro";
import { copyText } from "../lib/storage";
import "./Pro.css";

export function ProPage() {
  const { isPro, setPro, showToast } = useStore();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState("");
  const showMint = new URLSearchParams(window.location.search).has("mint");

  async function activate() {
    setBusy(true);
    try {
      const state = await activateProKey(key);
      setPro(state);
      showToast("Pro активирован");
      setKey("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ключ не подошёл");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pro-page">
      <div className="pro-head">
        <div>
          <p className="mono eyebrow">один продукт</p>
          <h2>{isPro ? "Pro включён" : "Письма и ритм. Не коучинг."}</h2>
          <p className="muted">
            Трекер бесплатный. Pro разово открывает шаблоны, пакет follow-up и копию плана коуча.
            Это инструмент в браузере — не созвоны и не настройка под ключ.
          </p>
        </div>
        {isPro && <span className="pro-badge mono">PRO</span>}
      </div>

      <div className="pro-compare">
        <article>
          <p className="mono tiny">free</p>
          <h3>Отклик</h3>
          <p className="pro-price">0 ₽</p>
          <ul>
            {FREE_PERKS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Link className="btn ghost" to="/app">
            В трекер
          </Link>
        </article>
        <article className="featured">
          <p className="mono tiny">разово · навсегда</p>
          <h3>Pro</h3>
          <p className="pro-price">{PRO_PRICE}</p>
          <ul>
            {PRO_PERKS.map((p) => (
              <li key={p.title}>
                <b>{p.title}.</b> {p.text}
              </li>
            ))}
          </ul>
          <a className="btn accent" href={telegramPayLink()} target="_blank" rel="noreferrer">
            Написать в Telegram · {PRO_PRICE}
          </a>
        </article>
      </div>

      <div className="pro-split">
        <section className="card pro-activate">
          <h3>Как купить</h3>
          <ol className="pro-steps">
            <li>Пишешь в Telegram</li>
            <li>Перевод {PRO_PRICE}</li>
            <li>Ключ OTK-····-···· сюда</li>
          </ol>
          <p className="tiny">Резюме на сервер не уезжает. Ключ живёт только в этом браузере.</p>
          <div className="pro-activate-row">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="OTK-····-····"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="btn" disabled={busy || !key.trim()} onClick={() => void activate()}>
              {busy ? "…" : "Активировать"}
            </button>
          </div>
          {isPro && (
            <div className="actions">
              <Link className="btn ghost" to="/app/letters">
                Шаблоны
              </Link>
              <Link className="btn ghost" to="/app/follow">
                Follow-up
              </Link>
              <Link className="btn ghost" to="/app/coach">
                Коуч
              </Link>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  void copyText(WEEK_RHYTHM).then(() => showToast("Ритм недели скопирован"))
                }
              >
                Ритм недели
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  clearPro();
                  setPro({ active: false });
                  showToast("Pro снят с этого браузера");
                }}
              >
                Снять
              </button>
            </div>
          )}
        </section>
        <section className="card">
          <h3>Чего здесь нет</h3>
          <ul className="pro-no">
            <li>Нет автооткликов на hh</li>
            <li>Нет созвонов и сопровождения</li>
            <li>Нет гарантии оффера</li>
          </ul>
          <a className="btn ghost" href={TG_URL} target="_blank" rel="noreferrer">
            Telegram
          </a>
        </section>
      </div>

      {showMint && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3>Выдать ключ</h3>
          <p className="tiny">Только продавец: /app/pro?mint=1</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void mintProKey()
                .then(async (k) => {
                  setMinted(k);
                  await copyText(k);
                  showToast("Ключ скопирован");
                })
                .catch((e) => showToast(e instanceof Error ? e.message : "Ошибка"));
            }}
          >
            Сгенерировать ключ
          </button>
          {minted && <p className="mono" style={{ marginTop: 10 }}>{minted}</p>}
        </section>
      )}
    </div>
  );
}
