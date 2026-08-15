import { useState } from "react";
import type { Profile } from "../types";
import { ensureNotifyPermission } from "../lib/notify";
import "./Onboarding.css";

type Props = {
  profile: Profile;
  onDone: (profile: Profile) => void;
};

export function Onboarding({ profile, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(profile);

  const steps = [
    {
      title: "Как тебя зовут?",
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
      title: "Твой стек",
      body: (
        <div className="field">
          <label>Через запятую — Radar будет матчить вакансии</label>
          <textarea
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            style={{ minHeight: 120 }}
          />
        </div>
      ),
    },
    {
      title: "Ссылки в письма",
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
        </div>
      ),
    },
    {
      title: "Ритм поиска",
      body: (
        <div className="grid-2">
          <div className="field">
            <label>Цель откликов / день</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.dailyGoal}
              onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) || 10 })}
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
          <label className="checkline">
            <input
              type="checkbox"
              checked={form.notifyFollowUps}
              onChange={(e) => setForm({ ...form, notifyFollowUps: e.target.checked })}
            />
            Напоминать о follow-up в браузере
          </label>
        </div>
      ),
    },
  ];

  async function finish() {
    if (form.notifyFollowUps) await ensureNotifyPermission();
    onDone({ ...form, onboardingDone: true, name: form.name.trim() || "Кандидат" });
  }

  return (
    <div className="onb-backdrop">
      <div className="onb card">
        <p className="mono onb-step">
          шаг {step + 1}/{steps.length}
        </p>
        <h2>{steps[step].title}</h2>
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
              В бой
            </button>
          )}
        </div>
        <p className="tiny">Данные останутся в этом браузере. Потом можно поменять в Профиле.</p>
      </div>
    </div>
  );
}
