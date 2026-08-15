export type ParsedVacancy = {
  company: string;
  role: string;
  salary: string;
  city: string;
  stack: string[];
  platform: string;
  url: string;
};

function firstMatch(text: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim().replace(/^["«]+|["».,;]+$/g, "");
  }
  return "";
}

export function detectPlatform(text: string) {
  const t = text.toLowerCase();
  if (/hh\.ru|rabota\.yandex/.test(t)) return "hh.ru";
  if (/career\.habr|habr\.com\/vacancies/.test(t)) return "Хабр Карьера";
  if (/linkedin\.com/.test(t)) return "LinkedIn";
  if (/getmatch\.ru/.test(t)) return "GetMatch";
  if (/t\.me\//.test(t)) return "Telegram";
  return "Другое";
}

export function parseVacancy(raw: string): ParsedVacancy {
  const text = raw.trim();
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s)>\]]+/gi)).map((m) =>
    m[0].replace(/[.,;]+$/, ""),
  );
  const url = urls[0] || "";
  const platform = detectPlatform(url || text);

  const company = firstMatch(text, [
    /компани[яи]\s*[:—-]\s*([^\n]{2,80})/i,
    /работодатель\s*[:—-]\s*([^\n]{2,80})/i,
    /employer\s*[:—-]\s*([^\n]{2,80})/i,
    /ооо\s+[«"]?([^»"\n]{2,80})/i,
  ]);

  const salary = firstMatch(text, [
    /зарплат[аы]\s*[:—-]\s*([^\n]{3,80})/i,
    /вилк[аи]\s*[:—-]\s*([^\n]{3,80})/i,
    /((?:от\s*)?\d[\d\s]{2,}(?:\s*[–—-]\s*\d[\d\s]{2,})?\s*(?:к|тыс|₽|руб|\$|€|net|gross)[^\n]{0,20})/i,
  ]);

  const city = firstMatch(text, [
    /город\s*[:—-]\s*([^\n]{2,60})/i,
    /локаци[яи]\s*[:—-]\s*([^\n]{2,60})/i,
    /((?:москва|санкт-петербург|спб|удал[её]нк\w*|remote|гибрид)[^\n]{0,40})/i,
  ]);

  const stackLine = firstMatch(text, [
    /стек\s*[:—-]\s*([^\n]{3,200})/i,
    /технологи[ия]\s*[:—-]\s*([^\n]{3,200})/i,
    /требования\s*[:—-]\s*([^\n]{3,200})/i,
    /skills?\s*[:—-]\s*([^\n]{3,200})/i,
  ]);
  const stack = stackLine
    ? stackLine
        .split(/[,;/|•·]+/)
        .map((s) => s.replace(/\d+(\.\d+)?/g, "").trim())
        .filter((s) => s.length > 1 && s.length < 28)
        .slice(0, 12)
    : [];

  const firstLine = text.split(/\n/).map((l) => l.trim()).find((l) => l && !/^https?:/i.test(l)) || "";
  let role = firstMatch(text, [
    /ваканси[яи]\s*[:—-]\s*([^\n]{3,90})/i,
    /должность\s*[:—-]\s*([^\n]{3,90})/i,
    /ищем\s+([^\n]{3,90})/i,
  ]);
  if (!role) {
    role = firstLine
      .replace(/^вакансия\s*[:—-]?\s*/i, "")
      .replace(/\s+в\s+[A-ZА-Я].+$/, "")
      .slice(0, 90);
  }
  if (role.length < 3) role = "";

  return { company, role, salary, city, stack, platform: platform === "Другое" && url ? "Сайт компании" : platform, url };
}
