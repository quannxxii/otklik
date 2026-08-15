import type { Application, LetterTemplate, Profile, Status, TimelineEvent, TimelineType } from "../types";
import { STATUS_LABEL } from "../types";
import { addDays, nowIso, renderLetter, today, uid } from "./storage";
import type { MatchResult } from "./match";
import type { ParsedVacancy } from "./parse";

export function event(type: TimelineType, text: string, at = new Date().toISOString()): TimelineEvent {
  return { id: uid(), at, type, text };
}

export function ensureTimeline(app: Application): Application {
  if (app.timeline?.length) return app;
  return {
    ...app,
    timeline: [
      event(
        app.status === "draft" ? "created" : (app.status as TimelineType),
        STATUS_LABEL[app.status],
        app.date || today(),
      ),
    ],
  };
}

export function pushEvent(app: Application, type: TimelineType, text: string): Application {
  const timeline = [...(app.timeline || []), event(type, text)];
  return { ...app, timeline, updatedAt: nowIso() };
}

export function withStatusChange(app: Application, status: Status): Application {
  if (app.status === status) return app;
  const type: TimelineType = status === "draft" ? "created" : (status as TimelineType);
  let next: Application = {
    ...app,
    status,
    updatedAt: today(),
    timeline: [...(app.timeline || []), event(type, STATUS_LABEL[status])],
  };
  if (status === "interview" && !next.interviewAt) next.interviewAt = today();
  return next;
}

export function letterFor(
  templates: LetterTemplate[],
  tplId: string,
  vars: { company: string; vacancy: string; profile: Profile; matched?: string },
) {
  const tpl = templates.find((t) => t.id === tplId) || templates.find((t) => t.id === "targeted") || templates[0];
  return tpl ? renderLetter(tpl.body, vars) : "";
}

export function buildFromRadar(input: {
  parsed: ParsedVacancy;
  match: MatchResult;
  profile: Profile;
  followDays: number;
  jd: string;
  status?: Status;
  existing?: Application | null;
}): Application {
  const { parsed, match, profile, followDays, jd, existing } = input;
  const status = input.status ?? "sent";
  const now = today();
  const company = parsed.company || match.guessedCompany || "Компания";
  const role = parsed.role || match.guessedRole || profile.role || "Разработчик";
  const base: Application = existing
    ? { ...existing }
    : {
        id: uid(),
        company: "",
        role: "",
        platform: "hh.ru",
        status,
        url: "",
        date: now,
        followUp: "",
        note: "",
        letterTpl: match.suggestedTpl,
        updatedAt: nowIso(),
        timeline: [],
      };

  return {
    ...base,
    company,
    role,
    platform: parsed.platform || base.platform,
    status,
    url: parsed.url || match.urls[0] || base.url,
    date: existing?.date || now,
    followUp: status === "sent" ? addDays(now, followDays) : existing?.followUp || "",
    note:
      status === "sent"
        ? match.matched.length
          ? `match ${match.score}% · ${match.matched.join(", ")}`
          : base.note
        : match.matched.length
          ? `письмо готово · match ${match.score}% · ${match.matched.join(", ")} — отправь на площадке сам`
          : "письмо скопировано — отправь на площадке сам",
    letterTpl: match.suggestedTpl,
    updatedAt: nowIso(),
    fitScore: match.score,
    salary: parsed.salary || base.salary,
    city: parsed.city || base.city,
    stack: parsed.stack.join(", ") || base.stack,
    jdRaw: jd,
    timeline: [
      ...(base.timeline || []),
      event(
        status === "sent" ? "sent" : "created",
        status === "sent"
          ? "Отмечено как отправлено"
          : "Пакет: письмо в буфер, статус черновик — подтверди отправку на площадке",
      ),
    ],
  };
}

export type WeekItem = {
  date: string;
  kind: "follow" | "interview" | "test";
  app: Application;
  label: string;
};

export function weekItems(apps: Application[], from = today()) {
  const start = new Date(`${from}T12:00:00`);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(today(d));
  }
  const set = new Set(days);
  const out: WeekItem[] = [];
  for (const app of apps) {
    if (app.followUp && set.has(app.followUp) && ["sent", "draft", "reply"].includes(app.status)) {
      out.push({ date: app.followUp, kind: "follow", app, label: "follow-up" });
    }
    if (app.interviewAt && set.has(app.interviewAt.slice(0, 10))) {
      out.push({ date: app.interviewAt.slice(0, 10), kind: "interview", app, label: "собес" });
    }
    if (app.testDeadline && set.has(app.testDeadline)) {
      out.push({ date: app.testDeadline, kind: "test", app, label: "тестовое" });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || a.app.company.localeCompare(b.app.company, "ru"));
  return { days, items: out };
}
