import type { Application, Profile, Status } from "../types";
import { STATUS_ORDER } from "../types";
import type { MatchResult } from "./match";
import { parseSkills } from "./match";
import { needsFollowUp } from "./storage";

export type CoachAction = {
  id: string;
  title: string;
  why: string;
  href?: string;
};

export type CoachReport = {
  source: "local" | "llm";
  headline: string;
  actions: CoachAction[];
  funnel: string;
  today: string[];
  skip: string;
  letter: string;
  gaps: string[];
};

export type CoachSnapshot = {
  profile: { name: string; role: string; city: string; skills: string[] };
  counts: Record<Status, number> & { total: number; sentLike: number };
  rates: { reply: number; interview: number; offer: number; avgFit: number | null };
  followUps: { company: string; role: string; date: string }[];
  rejects: Record<string, number>;
  recent: {
    company: string;
    role: string;
    status: Status;
    fitScore?: number;
    stack?: string;
    platform: string;
    jd?: string;
  }[];
  current?: {
    role: string;
    company: string;
    score: number;
    matched: string[];
    missing: string[];
    salary?: string;
    city?: string;
    stack?: string[];
    jd: string;
  };
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[ё]/g, "е");
}

export function buildSnapshot(
  apps: Application[],
  profile: Profile,
  extra?: { jd?: string; match?: MatchResult; company?: string; role?: string; salary?: string; city?: string; stack?: string[] },
): CoachSnapshot {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  apps.forEach((a) => {
    counts[a.status] = (counts[a.status] || 0) + 1;
  });
  const sentLike = apps.filter((a) => a.status !== "draft").length;
  const interviews = counts.interview + counts.offer;
  const withScore = apps.filter((a) => a.fitScore != null);
  const avgFit = withScore.length
    ? Math.round(withScore.reduce((s, a) => s + (a.fitScore || 0), 0) / withScore.length)
    : null;

  const rejects: Record<string, number> = {};
  apps
    .filter((a) => a.status === "reject")
    .forEach((a) => {
      const key = a.rejectReason || "не указана";
      rejects[key] = (rejects[key] || 0) + 1;
    });

  const followUps = apps
    .filter((a) => needsFollowUp(a, profile.followDays))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)
    .map((a) => ({ company: a.company, role: a.role, date: a.date }));

  const recent = [...apps]
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30)
    .map((a) => ({
      company: a.company,
      role: a.role,
      status: a.status,
      fitScore: a.fitScore,
      stack: a.stack,
      platform: a.platform,
      jd: (a.jdRaw || "").slice(0, 400),
    }));

  const snap: CoachSnapshot = {
    profile: {
      name: profile.name,
      role: profile.role,
      city: profile.city,
      skills: parseSkills(profile.skills),
    },
    counts: { ...counts, total: apps.length, sentLike },
    rates: {
      reply: sentLike ? Math.round(((counts.reply + interviews + counts.reject) / sentLike) * 100) : 0,
      interview: sentLike ? Math.round((interviews / sentLike) * 100) : 0,
      offer: sentLike ? Math.round((counts.offer / sentLike) * 100) : 0,
      avgFit,
    },
    followUps,
    rejects,
    recent,
  };

  if (extra?.jd?.trim() && extra.match) {
    snap.current = {
      role: extra.role || extra.match.guessedRole,
      company: extra.company || extra.match.guessedCompany,
      score: extra.match.score,
      matched: extra.match.matched,
      missing: extra.match.missing,
      salary: extra.salary,
      city: extra.city,
      stack: extra.stack,
      jd: extra.jd.slice(0, 4000),
    };
  }

  return snap;
}

function stackGaps(snap: CoachSnapshot) {
  const mine = new Set(snap.profile.skills.map(normalize));
  const freq = new Map<string, number>();
  const bump = (raw: string) => {
    const s = raw.trim();
    if (s.length < 2 || s.length > 28) return;
    if (mine.has(normalize(s))) return;
    freq.set(s, (freq.get(s) || 0) + 1);
  };
  for (const a of snap.recent) {
    (a.stack || "")
      .split(/[,;/|]+/)
      .forEach(bump);
  }
  snap.current?.stack?.forEach(bump);
  snap.current?.missing.slice(0, 8).forEach(bump);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
}

export function localCoach(snap: CoachSnapshot): CoachReport {
  const actions: CoachAction[] = [];
  const { counts, rates, followUps } = snap;
  const gaps = stackGaps(snap);

  if (snap.current) {
    return localVacancyCoach(snap, gaps);
  }

  if (!snap.counts.total) {
    return {
      source: "local",
      headline: "Пока нечего анализировать — сначала 3–5 точечных откликов.",
      actions: [
        {
          id: "radar",
          title: "Открой Radar и вставь первую вакансию",
          why: "Коуч учится на твоих статусах и match %, а не на абстрактном рынке.",
          href: "/app/radar",
        },
        {
          id: "stack",
          title: "Проверь стек в профиле",
          why: "Без стека Radar врёт, а советы будут пустыми.",
          href: "/app/settings",
        },
      ],
      funnel: "Воронка пустая. Цель на сегодня: 5 вакансий с match ≥ 45%, не «всем подряд».",
      today: [],
      skip: "Не рассылай одно письмо на 40 компаний. Это банят и не отвечает.",
      letter: "Пиши коротко: роль, 3 пересечения по стеку, ссылка на портфолио, готовность к тестовому.",
      gaps: [],
    };
  }

  if (followUps.length) {
    actions.push({
      id: "follow",
      title: `Напиши follow-up: ${followUps.length} молчат`,
      why: "Тишина после отклика чаще лечится пингом на 4–6 день, чем новым спамом.",
      href: "/app/follow",
    });
  }

  if (counts.sentLike >= 8 && rates.reply < 20) {
    actions.push({
      id: "letter",
      title: "Перепиши письмо под пересечения, не под «я fullstack»",
      why: `Ответов ~${rates.reply}% при ${counts.sentLike} откликах — слабый таргет или шаблон.`,
      href: "/app/letters",
    });
  }

  if (rates.avgFit != null && rates.avgFit < 40 && counts.sentLike >= 5) {
    actions.push({
      id: "focus",
      title: "Сужай поиск: сейчас слишком широкий match",
      why: `Средний fit ${rates.avgFit}%. Откликайся, где стек реально пересекается.`,
      href: "/app/radar",
    });
  }

  if (counts.interview >= 2 && counts.offer === 0) {
    actions.push({
      id: "prep",
      title: "Готовь собесы в карточке: что спросили, что доучить",
      why: "Доходишь до интервью, но оффера нет — фиксируй дыры после каждого звонка.",
      href: "/app/week",
    });
  }

  if (counts.sent < (snap.profile.skills.length ? 3 : 0) && counts.total < 5) {
    actions.push({
      id: "volume",
      title: "Добери объём: 8–12 точечных откликов в неделю",
      why: "На маленькой выборке воронка врёт. Ритм важнее идеального письма.",
      href: "/app/radar",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "keep",
      title: "Держи ритм: Radar → пакет → честный статус",
      why: "Воронка живая. Не бросай follow-up и не размывай стек.",
      href: "/app/radar",
    });
  }

  const rejectTop = Object.entries(snap.rejects).sort((a, b) => b[1] - a[1])[0];
  const funnelParts = [
    `${counts.total} в трекере, ${counts.sentLike} не черновики.`,
    `Ответ/реакция ${rates.reply}%, до собеса ${rates.interview}%, оффер ${rates.offer}%.`,
    rates.avgFit != null ? `Средний match ${rates.avgFit}%.` : "Match почти не размечен — гоняй вакансии через Radar.",
    rejectTop ? `Частый отказ: ${rejectTop[0]} (${rejectTop[1]}).` : "",
  ];

  let skip = "Пропускай вакансии с match < 30%, если это не компания мечты.";
  if (rates.avgFit != null && rates.avgFit < 40) {
    skip = "Слишком много слабых совпадений. Не откликайся «на всякий» — фильтр match ≥ 45%.";
  } else if (counts.sentLike >= 8 && rates.reply < 15) {
    skip = "Хватит лить в те же площадки тем же текстом. Смени шаблон и режь нерелевантные роли.";
  }

  let letter = "В каждом письме: 2–4 технологии из вакансии, один продукт/кейс, готовность к тестовому. Без простыни резюме.";
  if (counts.sentLike >= 8 && rates.reply < 20) {
    letter = "Текущий шаблон не цепляет. Бери «Под вакансию»: конкретный стек из JD, одна строка почему ты, без «ищу работу в принципе».";
  }

  const headline = followUps.length
    ? `Сначала закрой тишину: ${followUps.length} follow-up, потом новые отклики.`
    : rates.reply < 20 && counts.sentLike >= 8
      ? "Воронка сыпется на первом касании — письмо и таргет, не объём."
      : `Система живая: ${counts.sentLike} откликов, ${rates.interview}% доходят до собеса.`;

  return {
    source: "local",
    headline,
    actions: actions.slice(0, 5),
    funnel: funnelParts.filter(Boolean).join(" "),
    today: followUps.map((f) => `${f.company} — ${f.role}`),
    skip,
    letter,
    gaps,
  };
}

function localVacancyCoach(snap: CoachSnapshot, gaps: string[]): CoachReport {
  const cur = snap.current!;
  const score = cur.score;
  let headline = "Слабый матч — откликайся только если очень хочешь компанию.";
  let skip = "Можно пропустить: мало пересечений, письмо не спасёт.";
  if (score >= 70) {
    headline = "Сильный матч. Откликайся сегодня пакетом, письмо — только про пересечения.";
    skip = "Не размазывай резюме. Не откладывай: такие вакансии быстро закрывают.";
  } else if (score >= 45) {
    headline = "Нормальный матч. Бей точечно: в письме только общий стек, не весь бэкграунд.";
    skip = "Не выдумывай недостающие навыки. Лучше честно закрыть пересечения.";
  }

  const actions: CoachAction[] = [
    {
      id: "pkg",
      title: score >= 45 ? "Откликнуться пакетом" : "Черновик, если компания важна",
      why: score >= 45
        ? `Match ${score}%. Письмо + вкладка + follow-up закрывают отклик за минуту.`
        : `Match ${score}%. Не жги лимит площадки на слабый fit.`,
      href: "/app/radar",
    },
  ];
  if (cur.matched.length) {
    actions.push({
      id: "letter",
      title: `В письме выдели: ${cur.matched.slice(0, 4).join(", ")}`,
      why: "Рекрутер сканирует стек. Первые строки должны совпасть с JD.",
      href: "/app/letters",
    });
  }
  if (snap.followUps.length) {
    actions.push({
      id: "follow",
      title: "Не копи новые отклики поверх старых follow-up",
      why: `${snap.followUps.length} компаний молчат — пинг даёт ответ чаще, чем 10 новых «привет».`,
      href: "/app/follow",
    });
  }

  const letter = cur.matched.length
    ? `Коротко: отклик на «${cur.role || "роль"}» в ${cur.company || "компанию"}. Пересечения: ${cur.matched.slice(0, 6).join(", ")}. Тестовое готов сразу.`
    : "Пересечений мало — либо skip, либо одно честное предложение, зачем ты им без этого стека.";

  return {
    source: "local",
    headline,
    actions: actions.slice(0, 5),
    funnel: snap.counts.sentLike
      ? `По трекеру: реакция ${snap.rates.reply}%, собес ${snap.rates.interview}%. Эта вакансия — match ${score}%.`
      : `Эта вакансия — match ${score}%. Трекер ещё тонкий, решение принимай по стеку.`,
    today: snap.followUps.map((f) => `${f.company} — ${f.role}`),
    skip,
    letter,
    gaps: [...new Set([...gaps, ...cur.missing.slice(0, 4)])].slice(0, 6),
  };
}

export function emptyReport(): CoachReport {
  return {
    source: "local",
    headline: "",
    actions: [],
    funnel: "",
    today: [],
    skip: "",
    letter: "",
    gaps: [],
  };
}

export function coerceReport(raw: unknown, source: "local" | "llm"): CoachReport {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const actionsIn = Array.isArray(o.actions) ? o.actions : [];
  const actions: CoachAction[] = actionsIn
    .slice(0, 5)
    .map((item, i) => {
      const a = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(a.id || `a${i}`),
        title: String(a.title || "").slice(0, 160),
        why: String(a.why || "").slice(0, 280),
        href: safeAppHref(typeof a.href === "string" ? a.href : undefined),
      };
    })
    .filter((a) => a.title);
  const today = Array.isArray(o.today) ? o.today.map((x) => String(x)).filter(Boolean).slice(0, 8) : [];
  const gaps = Array.isArray(o.gaps) ? o.gaps.map((x) => String(x)).filter(Boolean).slice(0, 8) : [];
  return {
    source,
    headline: String(o.headline || "").slice(0, 240) || "Разбор готов.",
    actions,
    funnel: String(o.funnel || "").slice(0, 500),
    today,
    skip: String(o.skip || "").slice(0, 400),
    letter: String(o.letter || "").slice(0, 500),
    gaps,
  };
}

/** Only in-app relative paths — blocks javascript: and external URLs from LLM. */
export function safeAppHref(href?: string) {
  if (!href) return undefined;
  const h = href.trim();
  if (!h.startsWith("/app")) return undefined;
  if (h.includes("://") || h.includes("\\") || h.includes("..")) return undefined;
  if (!/^\/app(\/[\w\-./?]*)?$/.test(h)) return undefined;
  return h;
}
