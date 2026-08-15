import type { CoachReport, CoachSnapshot } from "./coach";
import { coerceReport } from "./coach";

export type AiSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

const AI_KEY = "otklik-ai-v1";

export const DEFAULT_AI: AiSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
};

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_KEY);
    if (!raw) return { ...DEFAULT_AI };
    const saved = JSON.parse(raw) as Partial<AiSettings>;
    return {
      apiKey: saved.apiKey || "",
      baseUrl: (saved.baseUrl || DEFAULT_AI.baseUrl).replace(/\/+$/, ""),
      model: saved.model || DEFAULT_AI.model,
    };
  } catch {
    return { ...DEFAULT_AI };
  }
}

export function saveAiSettings(s: AiSettings) {
  localStorage.setItem(
    AI_KEY,
    JSON.stringify({
      apiKey: s.apiKey,
      baseUrl: s.baseUrl.replace(/\/+$/, ""),
      model: s.model,
    }),
  );
}

export function clearAiSettings() {
  localStorage.removeItem(AI_KEY);
}

const SYSTEM = `Ты карьерный коуч для точечного поиска работы в IT (не спам-рассылка).
Отвечай ТОЛЬКО JSON без markdown со схемой:
{
  "headline": "одна фраза-вердикт",
  "actions": [{"id":"short","title":"что сделать","why":"почему","href":"/app/radar|/app/follow|/app/letters|/app/week|/app/settings"}],
  "funnel": "где течёт воронка",
  "today": ["Компания — роль"],
  "skip": "что не делать / какие вакансии пропускать",
  "letter": "как писать сопроводительное",
  "gaps": ["навык"]
}
Правила: 3–5 actions. Русский язык. Честно, коротко, конкретно по данным снимка. Не выдумывай компании, которых нет в снимке. Не советуй массовую рассылку.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() || trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Модель вернула не JSON");
  return JSON.parse(body.slice(start, end + 1));
}

export async function llmCoach(snap: CoachSnapshot, settings: AiSettings): Promise<CoachReport> {
  if (!settings.apiKey.trim()) throw new Error("Нет API-ключа — вставь в Профиле.");
  const base = settings.baseUrl.replace(/\/+$/, "") || DEFAULT_AI.baseUrl;
  const url = `${base}/chat/completions`;
  const payload = {
    model: settings.model || DEFAULT_AI.model,
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(snap) },
    ],
  };

  const call = (body: object) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify(body),
    });

  let res: Response;
  try {
    res = await call({ ...payload, response_format: { type: "json_object" } });
    if (res.status === 400) {
      res = await call(payload);
    }
  } catch {
    throw new Error("Сеть или CORS: нужен провайдер с доступом из браузера (OpenAI / Groq / OpenRouter) либо локальный прокси.");
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("Ключ отклонён. Проверь API key.");
    if (res.status === 404) throw new Error("Неверный base URL или модель. Для OpenAI: https://api.openai.com/v1 и gpt-4o-mini.");
    throw new Error(errText.slice(0, 180) || `Ошибка API ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(data.error.message);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ модели");
  return coerceReport(extractJson(content), "llm");
}

export async function pingAi(settings: AiSettings) {
  const report = await llmCoach(
    {
      profile: { name: "ping", role: "dev", city: "Москва", skills: ["TypeScript"] },
      counts: {
        draft: 0,
        sent: 1,
        reply: 0,
        interview: 0,
        offer: 0,
        reject: 0,
        total: 1,
        sentLike: 1,
      },
      rates: { reply: 0, interview: 0, offer: 0, avgFit: 50 },
      followUps: [],
      rejects: {},
      recent: [{ company: "PingCo", role: "Frontend", status: "sent", platform: "hh.ru" }],
    },
    settings,
  );
  return report.headline;
}
