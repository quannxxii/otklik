import { useEffect, useMemo, useState } from "react";
import "./CommandPalette.css";

type Item = { id: string; label: string; hint?: string; run: () => void };

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: Item[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((i) => `${i.label} ${i.hint || ""}`.toLowerCase().includes(query));
  }, [items, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.run();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <input
          autoFocus
          placeholder="Команда… (radar, follow, digest, settings)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
        />
        <ul>
          {filtered.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                className={idx === active ? "on" : ""}
                onMouseEnter={() => setActive(idx)}
                onClick={() => {
                  item.run();
                  onClose();
                }}
              >
                <span>{item.label}</span>
                {item.hint && <span className="hint">{item.hint}</span>}
              </button>
            </li>
          ))}
          {!filtered.length && <li className="empty">Ничего</li>}
        </ul>
        <p className="cmd-foot mono">↑↓ Enter · Esc</p>
      </div>
    </div>
  );
}
