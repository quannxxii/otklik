import type { LetterTemplate } from "../types";

const PRO_KEY = "otklik-pro-v1";
const SECRET = "otklik-pro-signal-2026";

export type ProState = {
  active: boolean;
  key?: string;
  activatedAt?: string;
};

export const TG_HANDLE = "n_a_o_a";
export const TG_URL = `https://t.me/${TG_HANDLE}`;

export const PRO_PRICE = "990 ₽";

export const PRO_PERKS = [
  { title: "Шаблоны под ситуацию", text: "Senior, cold HR, после тестового, Vue, Flutter — не одно письмо на всех." },
  { title: "Пакет follow-up", text: "Все письма тем, кто молчит, сразу в буфер. Не по одному." },
  { title: "План коуча в текст", text: "Разбор воронки + ритм на неделю копируются одним кликом." },
];

export const FREE_PERKS = [
  "Radar, трекер, канбан",
  "Follow-up по одному",
  "Локальный коуч на экране",
  "Расширение hh / Хабр",
];

export const PRO_TEMPLATES: LetterTemplate[] = [
  {
    id: "pro-senior",
    title: "Pro · Senior",
    body: `Привет! Я {{name}}, {{role}}, {{city}}.

Смотрю «{{vacancy}}» в {{company}}. По стеку пересечение: {{matched}}.
В коммерции закрывал фичи end-to-end — детали в портфолио.

Готов короткий созвон или тестовое на этой неделе.

{{links}}`,
  },
  {
    id: "pro-cold",
    title: "Pro · Cold HR",
    body: `Привет! Нашёл вакансию «{{vacancy}}» — {{company}}.

Коротко: {{role}}, {{city}}. Релевантный стек: {{matched}}.
Если резюме ок — готов тестовое без долгой переписки.

{{name}}
{{links}}`,
  },
  {
    id: "pro-after-test",
    title: "Pro · После тестового",
    body: `Привет! Сдал тестовое по «{{vacancy}}» в {{company}}.

Подскажите статус? Если нужны правки — сделаю быстро.
Готов следующий этап на этой неделе.

{{name}}
{{links}}`,
  },
  {
    id: "pro-vue",
    title: "Pro · Vue / PHP",
    body: `Привет! Я {{name}}, fullstack (Vue / PHP), {{city}}.

Отклик на «{{vacancy}}» в {{company}}. Пересечения: {{matched}}.
Умею довести фичу с клиента до бэка и продакшена.

Тестовое могу взять сразу.

{{links}}`,
  },
  {
    id: "pro-flutter",
    title: "Pro · Flutter",
    body: `Привет! Я {{name}}. Flutter / Dart, {{city}}.

Интересна «{{vacancy}}» в {{company}}. По стеку: {{matched}}.
Есть свой продукт на Flutter + Supabase — могу показать.

Готов тестовое или короткий созвон.

{{links}}`,
  },
];

export const WEEK_RHYTHM = `Ритм недели (точечный поиск, не спам)
Пн — 8–12 откликов, только match ≥ 45%
Вт — follow-up тем, кто молчит 4–6 дней
Ср — 5–8 новых + разбор отказов в карточке
Чт — собесы / тестовые, заметки в трекере
Пт — 5 точечных в компании, которые реально хочешь
Сб — доучить 1 пробел из коуча, не лить отклики
Вс — digest: сколько sent / reply / собес. Цель на понедельник.`;

export function telegramPayLink() {
  const text = encodeURIComponent(
    `Привет! Хочу Отклик Pro за ${PRO_PRICE}.\nСайт: https://otklik-gamma.vercel.app/app/pro`,
  );
  return `${TG_URL}?text=${text}`;
}

export function loadPro(): ProState {
  try {
    const raw = localStorage.getItem(PRO_KEY);
    if (!raw) return { active: false };
    const saved = JSON.parse(raw) as ProState;
    return { active: Boolean(saved.active), key: saved.key, activatedAt: saved.activatedAt };
  } catch {
    return { active: false };
  }
}

export function savePro(state: ProState) {
  localStorage.setItem(PRO_KEY, JSON.stringify(state));
}

export function clearPro() {
  localStorage.removeItem(PRO_KEY);
}

function normalizeKey(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function digestHex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidProKey(raw: string) {
  const n = normalizeKey(raw);
  if (!/^OTK[A-F0-9]{8}$/.test(n)) return false;
  const h = await digestHex(SECRET + n);
  return h.startsWith("00");
}

export async function mintProKey(nonce = crypto.randomUUID()) {
  for (let i = 0; i < 200000; i++) {
    const body = (await digestHex(`${SECRET}:${nonce}:${i}`)).slice(0, 8).toUpperCase();
    const compact = `OTK${body}`;
    if ((await digestHex(SECRET + compact)).startsWith("00")) {
      return `OTK-${body.slice(0, 4)}-${body.slice(4)}`;
    }
  }
  throw new Error("Не удалось сгенерировать ключ");
}

export async function activateProKey(raw: string): Promise<ProState> {
  const ok = await isValidProKey(raw);
  if (!ok) throw new Error("Ключ не подошёл. Проверь или напиши в Telegram.");
  const state: ProState = {
    active: true,
    key: normalizeKey(raw),
    activatedAt: new Date().toISOString().slice(0, 10),
  };
  savePro(state);
  return state;
}

export function visibleTemplates(all: LetterTemplate[], isPro: boolean) {
  if (isPro) {
    const ids = new Set(all.map((t) => t.id));
    const extra = PRO_TEMPLATES.filter((t) => !ids.has(t.id));
    return [...all, ...extra];
  }
  return all.filter((t) => !t.id.startsWith("pro-"));
}
