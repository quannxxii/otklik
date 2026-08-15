import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Profile } from "../types";
import { ensureNotifyPermission } from "../lib/notify";
import "./Onboarding.css";

type Props = {
  profile: Profile;
  onDone: (profile: Profile) => void;
};

export function Onboarding({ profile, onDone }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(profile);

  const steps = [
    {
      title: "Кто ты",
      lead: "Имя и роль попадут в письма. Потом можно поменять в Профиле.",
      body: (
        <div className="grid-2">
          <div className="field">
            <label>Имя</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Никита"
            />
          </div>
          <div className="field">
            <label>Город</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Роль</label>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
        </div>
      ),
    },
    {
      title: "Стек для Radar",
      lead: "Через запятую. Match считается по стеку вакансии — чем точнее список, тем честнее %.",
      body: (
        <div className="field">
          <label>Навыки</label>
          <textarea
            autoFocus
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            style={{ minHeight: 120 }}
            placeholder="TypeScript, Vue, PHP, Flutter…"
          />
        </div>
      ),
    },
    {
      title: "Почти готово",
      lead: "Ссылки в письма и цель на день (точечные, не спам). Дальше — экран Сегодня.",
      body: (
        <div className="grid-2">
          {(
            [
              ["portfolio", "Портфолио"],
              ["github", "GitHub"],
              ["telegram", "Telegram"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="field">
            <label>Цель откликов / день</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.dailyGoal}
              onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 5 })}
            />
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
        </div>
      ),
    },
  ];

  async function finish() {
    if (form.notifyFollowUps) await ensureNotifyPermission();
    onDone({ ...form, onboardingDone: true, name: form.name.trim() || "Кандидат" });
    navigate("/app");
  }

  return (
    <div className="onb-backdrop">
      <div className="onb card">
        <p className="mono onb-step">
          шаг {step + 1}/{steps.length}
        </p>
        <h2>{steps[step].title}</h2>
        <p className="muted onb-lead">{steps[step].lead}</p>
        {steps[step].body}
        <div className="actions">
          {step > 0 && (
            <button type="button" className="btn ghost" onClick={() => setStep((s) => s - 1)}>
              Назад
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="btn accent"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name.trim()}
            >
              Дальше
            </button>
          ) : (
            <button type="button" className="btn accent" onClick={() => void finish()}>
              На Сегодня
            </button>
          )}
        </div>
        <p className="tiny">Данные только в этом браузере. Бэкап — в Профиле, если важно не потерять.</p>
      </div>
    </div>
  );
}
