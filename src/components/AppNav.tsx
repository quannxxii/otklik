import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const MORE_LINKS = [
  { to: "/app/follow", label: "Follow-up" },
  { to: "/app/week", label: "Неделя" },
  { to: "/app/coach", label: "Коуч" },
  { to: "/app/letters", label: "Письма" },
  { to: "/app/insights", label: "Инсайты" },
  { to: "/app/pro", label: "Pro", pro: true },
  { to: "/app/settings", label: "Профиль" },
] as const;

type Props = { isPro: boolean };

export function AppNav({ isPro }: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const moreActive = useMemo(
    () => MORE_LINKS.some((l) => location.pathname === l.to || location.pathname.startsWith(`${l.to}/`)),
    [location.pathname],
  );

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <nav className="app-nav">
      <NavLink to="/app" end>
        Сегодня
      </NavLink>
      <NavLink to="/app/radar">Radar</NavLink>
      <NavLink to="/app/tracker">Трекер</NavLink>
      <div className={`app-nav-more${open ? " open" : ""}${moreActive ? " active" : ""}`} ref={rootRef}>
        <button
          type="button"
          className={`app-nav-more-btn${moreActive ? " active" : ""}`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          Ещё
        </button>
        {open && (
          <div className="app-nav-menu" role="menu">
            {MORE_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                role="menuitem"
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={() => setOpen(false)}
              >
                {"pro" in l && l.pro ? (isPro ? "Pro ✓" : "Pro") : l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
