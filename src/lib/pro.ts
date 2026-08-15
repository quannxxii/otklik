import type { LetterTemplate } from "../types";

const PRO_KEY = "otklik-pro-v1";
/** Obfuscated pepper — still client-side; real protection is key re-check on every load. */
const PEPPER_PARTS = ["otklik", "pro", "signal", "2026"] as const;
function pepper() {
  return PEPPER_PARTS.join("-");
}

export type ProState = {
  active: boolean;
  key?: string;
  activatedAt?: string;
};

export const TG_HANDLE = "n_a_o_a";
export const TG_URL = `https://t.me/${TG_HANDLE}`;

export const PRO_PRICE = "990 ₽";

export const PRO_PERKS = [
  { title: "Письма под пересечения", text: "Senior, cold HR, после тестового, Vue, Flutter — список матчей, не вода." },
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
    body: `Привет! {{name}}, {{role}}.

«{{vacancy}}» / {{company}} — откликаюсь по пересечениям:
{{matched_lines}}

Закрываю фичи end-to-end; портфолио ниже. Готов созвон или тестовое на этой неделе.

{{links}}`,
  },
  {
    id: "pro-cold",
    title: "Pro · Cold HR",
    body: `Привет! Вакансия «{{vacancy}}» — {{company}}.

{{role}}, {{city}}. Почему я:
{{matched_lines}}

Если резюме ок — тестовое без долгой переписки.

{{name}}
{{links}}`,
  },
  {
    id: "pro-after-test",
    title: "Pro · После тестового",
    body: `Привет! Сдал тестовое по «{{vacancy}}» ({{company}}).

Подскажите статус? Правки сделаю быстро. Готов следующий этап на этой неделе.

{{name}}
{{links}}`,
  },
  {
    id: "pro-vue",
    title: "Pro · Vue / PHP",
    body: `Привет! {{name}}, Vue / PHP, {{city}}.

На «{{vacancy}}» в {{company}} закрываю:
{{matched_lines}}

Фича с клиента до бэка и прода. Тестовое могу сразу.

{{links}}`,
  },
  {
    id: "pro-flutter",
    title: "Pro · Flutter",
    body: `Привет! {{name}}, Flutter / Dart, {{city}}.

Интересна «{{vacancy}}» в {{company}}:
{{matched_lines}}

Есть свой продукт на Flutter + Supabase — покажу. Готов тестовое или короткий созвон.

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

function normalizeKey(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function digestHex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Valid when SHA-256(pepper + compactKey) starts with 000 (~12 bit). */
export async function isValidProKey(raw: string) {
  const n = normalizeKey(raw);
  if (!/^OTK[A-F0-9]{8}$/.test(n)) return false;
  const h = await digestHex(pepper() + n);
  return h.startsWith("000");
}

/** Only trust a stored key after crypto check — never the `active` flag alone. */
export async function resolvePro(): Promise<ProState> {
  try {
    const raw = localStorage.getItem(PRO_KEY);
    if (!raw) return { active: false };
    const saved = JSON.parse(raw) as ProState;
    if (!saved.key || !(await isValidProKey(saved.key))) {
      clearPro();
      return { active: false };
    }
    const state: ProState = {
      active: true,
      key: normalizeKey(saved.key),
      activatedAt: saved.activatedAt,
    };
    savePro(state);
    return state;
  } catch {
    clearPro();
    return { active: false };
  }
}

export function loadPro(): ProState {
  try {
    const raw = localStorage.getItem(PRO_KEY);
    if (!raw) return { active: false };
    const saved = JSON.parse(raw) as ProState;
    // Optimistic UI only if key present; hydrate validates async.
    if (!saved.key) return { active: false };
    return { active: false, key: saved.key, activatedAt: saved.activatedAt };
  } catch {
    return { active: false };
  }
}

export function savePro(state: ProState) {
  if (!state.active || !state.key) {
    clearPro();
    return;
  }
  localStorage.setItem(
    PRO_KEY,
    JSON.stringify({
      active: true,
      key: normalizeKey(state.key),
      activatedAt: state.activatedAt,
    }),
  );
}

export function clearPro() {
  localStorage.removeItem(PRO_KEY);
}

/**
 * Seller mint: ?mint=1 + passphrase (not in the URL).
 * Still client-side — no public backend — but stops casual ?mint=1 abuse.
 */
export async function canMint(sellerPass: string) {
  const got = await digestHex(`${pepper()}:seller:${sellerPass.trim()}`);
  // sha256("otklik-pro-signal-2026:seller:n_a_o_a_mint") — change passphrase by regenerating this.
  const expected = await digestHex(`${pepper()}:seller:n_a_o_a_mint`);
  return got === expected;
}

export async function mintProKey(nonce = crypto.randomUUID()) {
  for (let i = 0; i < 500000; i++) {
    const body = (await digestHex(`${pepper()}:${nonce}:${i}`)).slice(0, 8).toUpperCase();
    const compact = `OTK${body}`;
    if ((await digestHex(pepper() + compact)).startsWith("000")) {
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

/** Persist only user templates; Pro packs are injected at runtime. */
export function stripProTemplates(all: LetterTemplate[]) {
  return all.filter((t) => !t.id.startsWith("pro-"));
}

export function visibleTemplates(all: LetterTemplate[], isPro: boolean) {
  const base = stripProTemplates(all);
  if (!isPro) return base;
  const ids = new Set(base.map((t) => t.id));
  const extra = PRO_TEMPLATES.filter((t) => !ids.has(t.id));
  return [...base, ...extra];
}
