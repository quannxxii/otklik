import { useStore } from "../store";

export function PlatformsPage() {
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
