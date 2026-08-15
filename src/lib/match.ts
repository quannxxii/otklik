export type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  guessedRole: string;
  guessedCompany: string;
  urls: string[];
  suggestedTpl: string;
  verdict: string;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[ё]/g, "е");
}

export function parseSkills(skills: string) {
  return skills
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function analyzeVacancy(jd: string, skillsCsv: string): MatchResult {
  const text = jd.trim();
  const low = normalize(text);
  const skills = parseSkills(skillsCsv);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of skills) {
    const s = normalize(skill);
    if (!s) continue;
    // word-ish match
    const re = new RegExp(`(^|[^a-zа-я0-9+.#])${escapeReg(s)}([^a-zа-я0-9+.#]|$)`, "i");
    if (re.test(low) || low.includes(s)) matched.push(skill);
    else missing.push(skill);
  }

  const score =
    skills.length === 0
      ? 0
      : Math.round((matched.length / Math.max(skills.length, 1)) * 100);

  const urls = Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi)).map((m) => m[0]);

  let guessedCompany = "";
  const companyPatterns = [
    /компани[яи]\s*[:—-]?\s*([^\n,.(]{2,60})/i,
    /employer\s*[:—-]?\s*([^\n,.(]{2,60})/i,
    /ооо\s+[«"]?([^»"\n.]{2,60})/i,
    /в\s+([A-ZА-Я][A-Za-zА-Яа-я0-9&.\- ]{1,40})\s+ищем/i,
  ];
  for (const re of companyPatterns) {
    const m = text.match(re);
    if (m?.[1]) {
      guessedCompany = m[1].trim();
      break;
    }
  }

  const firstLine = text.split(/\n/).map((l) => l.trim()).find(Boolean) || "";
  let guessedRole = firstLine
    .replace(/^вакансия\s*[:—-]?\s*/i, "")
    .replace(/\s+в\s+.+$/i, "")
    .slice(0, 80);
  if (guessedRole.length < 4) guessedRole = "";

  let suggestedTpl = "fullstack";
  if (matched.some((m) => /flutter|dart/i.test(m))) suggestedTpl = "targeted";
  else if (matched.some((m) => /vue|react|frontend|next/i.test(m)) && !matched.some((m) => /php|backend|fastapi/i.test(m)))
    suggestedTpl = "frontend";
  else if (matched.length >= 3) suggestedTpl = "targeted";
  else if (matched.length <= 1) suggestedTpl = "short";

  let verdict = "Слабое пересечение — либо учись под вакансию, либо пропускай.";
  if (score >= 70) verdict = "Сильный матч. Откликайся сегодня, письмо пиши под стек.";
  else if (score >= 45) verdict = "Нормальный матч. В письме выдели пересечения, не всё резюме.";
  else if (score >= 25) verdict = "Слабовато. Откликайся только если очень хочешь компанию.";

  return {
    score,
    matched,
    missing: missing.slice(0, 12),
    guessedRole,
    guessedCompany,
    urls,
    suggestedTpl,
    verdict,
  };
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildWeeklyDigest(
  apps: { date: string; company: string; status: string; role: string }[],
  name: string,
) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekIso = weekAgo.toISOString().slice(0, 10);

  const recent = apps.filter((a) => a.date >= weekIso);
  const byStatus: Record<string, number> = {};
  recent.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  });

  const lines = [
    `Недельный отчёт${name ? ` — ${name}` : ""}`,
    `Период: последние 7 дней`,
    `Откликов: ${recent.length}`,
    `Отправлено: ${byStatus.sent || 0}`,
    `Ответы: ${byStatus.reply || 0}`,
    `Собесы: ${byStatus.interview || 0}`,
    `Офферы: ${byStatus.offer || 0}`,
    `Отказы: ${byStatus.reject || 0}`,
    "",
    "Компании:",
    ...(recent.length
      ? recent.map((a) => `• ${a.company} — ${a.role} [${a.status}]`)
      : ["• пока пусто"]),
  ];
  return lines.join("\n");
}

export function heatmapDays(apps: { date: string }[], days = 28) {
  const map = new Map<string, number>();
  apps.forEach((a) => map.set(a.date, (map.get(a.date) || 0) + 1));
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, count: map.get(iso) || 0 });
  }
  return out;
}

export function streakCount(apps: { date: string; status: string }[]) {
  const days = new Set(apps.filter((a) => a.status !== "draft").map((a) => a.date));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (days.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // allow today empty → check yesterday start
      if (streak === 0 && iso === new Date().toISOString().slice(0, 10)) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}
