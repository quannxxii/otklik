export type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  guessedRole: string;
  guessedCompany: string;
  urls: string[];
  suggestedTpl: string;
  verdict: string;
  vacancySkills: string[];
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

/** Catalog used to detect skills mentioned in a JD. Longer aliases first. */
const SKILL_CATALOG: { label: string; aliases: string[] }[] = [
  { label: "TypeScript", aliases: ["typescript", "ts"] },
  { label: "JavaScript", aliases: ["javascript", "js", "es6", "es2015"] },
  { label: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { label: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { label: "Vue", aliases: ["vue.js", "vuejs", "vue 3", "vue3", "nuxt", "vue"] },
  { label: "React", aliases: ["react.js", "reactjs", "react native", "react"] },
  { label: "Flutter", aliases: ["flutter"] },
  { label: "Dart", aliases: ["dart"] },
  { label: "PHP", aliases: ["php", "laravel", "symfony"] },
  { label: "PostgreSQL", aliases: ["postgresql", "postgres", "psql"] },
  { label: "Supabase", aliases: ["supabase"] },
  { label: "Docker", aliases: ["docker", "dockerfile"] },
  { label: "Python", aliases: ["python", "django", "fastapi", "flask"] },
  { label: "Go", aliases: ["golang", " go "] },
  { label: "Java", aliases: ["java"] },
  { label: "Kotlin", aliases: ["kotlin"] },
  { label: "Swift", aliases: ["swift"] },
  { label: "C#", aliases: ["c#", "csharp", ".net", "dotnet"] },
  { label: "GraphQL", aliases: ["graphql"] },
  { label: "Redis", aliases: ["redis"] },
  { label: "MongoDB", aliases: ["mongodb", "mongo"] },
  { label: "MySQL", aliases: ["mysql", "mariadb"] },
  { label: "AWS", aliases: ["aws", "amazon web services"] },
  { label: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { label: "CI/CD", aliases: ["ci/cd", "github actions", "gitlab ci"] },
  { label: "Tailwind", aliases: ["tailwind", "tailwindcss"] },
  { label: "Svelte", aliases: ["svelte", "sveltekit"] },
  { label: "Angular", aliases: ["angular"] },
  { label: "Rust", aliases: ["rust"] },
  { label: "Ruby", aliases: ["ruby", "rails"] },
];

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function skillInText(alias: string, low: string) {
  const a = normalize(alias).trim();
  if (!a) return false;
  // padded Go handled as " go "
  if (a.startsWith(" ") || a.endsWith(" ")) return low.includes(a);
  const re = new RegExp(`(^|[^a-zа-я0-9+.#])${escapeReg(a)}([^a-zа-я0-9+.#]|$)`, "i");
  return re.test(low);
}

/** Skills required by the vacancy (catalog + explicit stack lines). */
export function extractVacancySkills(jd: string, hintStack: string[] = []): string[] {
  const low = ` ${normalize(jd)} `;
  const found: string[] = [];
  const seen = new Set<string>();

  for (const item of SKILL_CATALOG) {
    if (item.aliases.some((al) => skillInText(al, low))) {
      const key = normalize(item.label);
      if (!seen.has(key)) {
        seen.add(key);
        found.push(item.label);
      }
    }
  }

  for (const h of hintStack) {
    const label = h.trim();
    if (label.length < 2 || label.length > 28) continue;
    const key = normalize(label);
    if (seen.has(key)) continue;
    // Prefer catalog label if alias matches
    const cat = SKILL_CATALOG.find((c) => c.aliases.some((al) => normalize(al) === key) || normalize(c.label) === key);
    const out = cat?.label || label;
    const outKey = normalize(out);
    if (!seen.has(outKey)) {
      seen.add(outKey);
      found.push(out);
    }
  }

  return found;
}

function userHasSkill(userSkills: string[], vacancySkill: string) {
  const v = normalize(vacancySkill);
  const vAliases =
    SKILL_CATALOG.find((c) => normalize(c.label) === v)?.aliases.map(normalize) || [v];

  return userSkills.some((u) => {
    const un = normalize(u);
    if (!un) return false;
    if (un === v || vAliases.includes(un)) return true;
    // user listed catalog alias of vacancy skill
    const uCat = SKILL_CATALOG.find(
      (c) => normalize(c.label) === un || c.aliases.some((al) => normalize(al) === un),
    );
    if (uCat && normalize(uCat.label) === v) return true;
    // careful substring only for multi-char and not java⊂javascript style
    if (v.length >= 4 && un.length >= 4) {
      if (v.includes(un) || un.includes(v)) {
        // block java / javascript false friends
        if ((v === "java" && un.includes("javascript")) || (un === "java" && v.includes("javascript")))
          return false;
        if ((v === "js" && un === "java") || (un === "js" && v === "java")) return false;
        return true;
      }
    }
    return false;
  });
}

export function analyzeVacancy(
  jd: string,
  skillsCsv: string,
  opts?: { isPro?: boolean; hintStack?: string[] },
): MatchResult {
  const text = jd.trim();
  const userSkills = parseSkills(skillsCsv);
  const vacancySkills = extractVacancySkills(text, opts?.hintStack || []);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const vs of vacancySkills) {
    if (userHasSkill(userSkills, vs)) matched.push(vs);
    else missing.push(vs);
  }

  // If JD has no detectable stack, fall back to overlap of user skills mentioned in text
  let score = 0;
  if (vacancySkills.length === 0) {
    const low = normalize(text);
    for (const skill of userSkills) {
      const s = normalize(skill);
      if (!s || s.length < 2) continue;
      if (skillInText(s, low)) matched.push(skill);
    }
    score = matched.length === 0 ? 0 : Math.min(100, 20 + matched.length * 12);
  } else {
    score = Math.round((matched.length / vacancySkills.length) * 100);
  }

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

  const allHits = matched.map(normalize);
  let suggestedTpl = "fullstack";
  if (opts?.isPro) {
    if (allHits.some((m) => /flutter|dart/.test(m))) suggestedTpl = "pro-flutter";
    else if (allHits.some((m) => /vue|php|laravel/.test(m))) suggestedTpl = "pro-vue";
    else if (score >= 70) suggestedTpl = "pro-senior";
    else if (score < 40) suggestedTpl = "pro-cold";
    else suggestedTpl = "targeted";
  } else if (allHits.some((m) => /flutter|dart/.test(m))) suggestedTpl = "targeted";
  else if (allHits.some((m) => /vue|react|frontend|next/.test(m)) && !allHits.some((m) => /php|backend|fastapi|laravel/.test(m)))
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
    vacancySkills,
  };
}

export function buildWeeklyDigest(
  apps: { date: string; company: string; status: string; role: string }[],
  name: string,
) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekIso = localIsoDate(weekAgo);

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

function localIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function heatmapDays(apps: { date: string }[], days = 28) {
  const map = new Map<string, number>();
  apps.forEach((a) => map.set(a.date, (map.get(a.date) || 0) + 1));
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = localIsoDate(d);
    out.push({ date: iso, count: map.get(iso) || 0 });
  }
  return out;
}

export function streakCount(apps: { date: string; status: string }[]) {
  const days = new Set(apps.filter((a) => a.status !== "draft").map((a) => a.date));
  let streak = 0;
  const cursor = new Date();
  const todayIso = localIsoDate(new Date());
  for (;;) {
    const iso = localIsoDate(cursor);
    if (days.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      if (streak === 0 && iso === todayIso) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}
