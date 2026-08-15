/* global chrome */
(function (root) {
  const KEYS = {
    apps: "otklik-apps-v1",
    profile: "otklik-profile-v1",
    templates: "otklik-templates-v1",
    sync: "otklik-sync-at",
  };

  const DEFAULT_PROFILE = {
    name: "",
    role: "Fullstack-разработчик",
    city: "Москва",
    email: "",
    telegram: "",
    github: "",
    portfolio: "",
    skills: "JavaScript, TypeScript, Vue, React, PHP, Flutter, Dart, Supabase, PostgreSQL, Next.js",
    dailyGoal: 10,
    followDays: 5,
    notifyFollowUps: true,
    onboardingDone: false,
  };

  const DEFAULT_TEMPLATES = [
    {
      id: "fullstack",
      title: "Fullstack",
      body: "Привет! Я {{name}}, {{role}}, {{city}}.\n\nОткликаюсь на «{{vacancy}}» в {{company}}. Кратко о себе: коммерческий опыт и свои продукты — детали в портфолио.\n\nСтек, который пересекается: {{matched}}.\n\nИщу full-time ({{city}} / remote). Тестовое готов взять сразу.\n\n{{links}}",
    },
    {
      id: "frontend",
      title: "Frontend",
      body: "Привет! Я {{name}}, frontend / fullstack из {{city}}.\n\nИнтересна вакансия «{{vacancy}}» в {{company}}. По стеку пересекаемся: {{matched}}.\n\nFull-time, готов к тестовому.\n\n{{links}}",
    },
    {
      id: "short",
      title: "Короткий",
      body: "Привет! {{name}}, {{role}}, {{city}}.\nОтклик на «{{vacancy}}» — {{company}}.\nСтек: {{matched}}\n{{links}}\nТестовое могу сразу.",
    },
    {
      id: "targeted",
      title: "Под вакансию",
      body: "Привет! Я {{name}}.\n\nУвидел «{{vacancy}}» в {{company}} — откликаюсь точечно.\nВ требованиях вижу {{matched}}. Это мой основной контур: {{role}}, {{city}}.\n\nГотов тестовое или короткий созвон.\n\n{{links}}",
    },
    {
      id: "followup",
      title: "Follow-up",
      body: "Привет! Несколько дней назад откликался на «{{vacancy}}» в {{company}}.\nПодскажите, резюме дошло? Если удобно — готов тестовое или короткий созвон.\n\n{{name}}\n{{links}}",
    },
  ];

  const PRO_TEMPLATES = [
    {
      id: "pro-senior",
      title: "Pro · Senior",
      body: "Привет! Я {{name}}, {{role}}, {{city}}.\n\nСмотрю «{{vacancy}}» в {{company}}. По стеку пересечение: {{matched}}.\nВ коммерции закрывал фичи end-to-end — детали в портфолио.\n\nГотов короткий созвон или тестовое на этой неделе.\n\n{{links}}",
    },
    {
      id: "pro-cold",
      title: "Pro · Cold HR",
      body: "Привет! Нашёл вакансию «{{vacancy}}» — {{company}}.\n\nКоротко: {{role}}, {{city}}. Релевантный стек: {{matched}}.\nЕсли резюме ок — готов тестовое без долгой переписки.\n\n{{name}}\n{{links}}",
    },
    {
      id: "pro-vue",
      title: "Pro · Vue / PHP",
      body: "Привет! Я {{name}}, fullstack (Vue / PHP), {{city}}.\n\nОтклик на «{{vacancy}}» в {{company}}. Пересечения: {{matched}}.\nУмею довести фичу с клиента до бэка и продакшена.\n\nТестовое могу взять сразу.\n\n{{links}}",
    },
    {
      id: "pro-flutter",
      title: "Pro · Flutter",
      body: "Привет! Я {{name}}. Flutter / Dart, {{city}}.\n\nИнтересна «{{vacancy}}» в {{company}}. По стеку: {{matched}}.\nЕсть свой продукт на Flutter + Supabase — могу показать.\n\nГотов тестовое или короткий созвон.\n\n{{links}}",
    },
  ];

  const SKILL_CATALOG = [
    { label: "TypeScript", aliases: ["typescript", "ts"] },
    { label: "JavaScript", aliases: ["javascript", "js"] },
    { label: "Next.js", aliases: ["next.js", "nextjs"] },
    { label: "Vue", aliases: ["vue.js", "vuejs", "vue 3", "vue"] },
    { label: "React", aliases: ["react.js", "reactjs", "react"] },
    { label: "Flutter", aliases: ["flutter"] },
    { label: "Dart", aliases: ["dart"] },
    { label: "PHP", aliases: ["php", "laravel"] },
    { label: "PostgreSQL", aliases: ["postgresql", "postgres"] },
    { label: "Supabase", aliases: ["supabase"] },
    { label: "Docker", aliases: ["docker"] },
    { label: "Python", aliases: ["python", "fastapi"] },
    { label: "Node.js", aliases: ["node.js", "nodejs"] },
  ];

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function today(d) {
    const x = d || new Date();
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function nowIso() {
    return new Date().toISOString();
  }
  function addDays(iso, n) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function normalize(s) {
    return String(s).toLowerCase().replace(/ё/g, "е");
  }
  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function parseSkills(skills) {
    return String(skills || "")
      .split(/[,;/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function firstMatch(text, patterns) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) return m[1].trim().replace(/^["«]+|["».,;]+$/g, "");
    }
    return "";
  }

  function detectPlatform(text) {
    const t = String(text).toLowerCase();
    if (/hh\.ru|rabota\.yandex/.test(t)) return "hh.ru";
    if (/career\.habr|habr\.com\/vacancies/.test(t)) return "Хабр Карьера";
    if (/linkedin\.com/.test(t)) return "LinkedIn";
    if (/getmatch\.ru/.test(t)) return "GetMatch";
    return "Другое";
  }

  function parseVacancy(raw) {
    const text = String(raw || "").trim();
    const urls = Array.from(text.matchAll(/https?:\/\/[^\s)>\]]+/gi)).map((m) => m[0].replace(/[.,;]+$/, ""));
    const url = urls[0] || "";
    const platform = detectPlatform(url || text);
    const company = firstMatch(text, [
      /компани[яи]\s*[:—-]\s*([^\n]{2,80})/i,
      /работодатель\s*[:—-]\s*([^\n]{2,80})/i,
    ]);
    const salary = firstMatch(text, [
      /зарплат[аы]\s*[:—-]\s*([^\n]{3,80})/i,
      /((?:от\s*)?\d[\d\s]{2,}(?:\s*[–—-]\s*\d[\d\s]{2,})?\s*(?:к|тыс|₽|руб|\$|€|net|gross)[^\n]{0,20})/i,
    ]);
    const city = firstMatch(text, [
      /город\s*[:—-]\s*([^\n]{2,60})/i,
      /((?:москва|санкт-петербург|спб|удал[её]нк\w*|remote|гибрид)[^\n]{0,40})/i,
    ]);
    const stackLine = firstMatch(text, [
      /стек\s*[:—-]\s*([^\n]{3,200})/i,
      /технологи[ия]\s*[:—-]\s*([^\n]{3,200})/i,
    ]);
    const stack = stackLine
      ? stackLine
          .split(/[,;/|•·]+/)
          .map((s) => s.replace(/\d+(\.\d+)?/g, "").trim())
          .filter((s) => s.length > 1 && s.length < 28)
          .slice(0, 12)
      : [];
    const firstLine = text.split(/\n/).map((l) => l.trim()).find((l) => l && !/^https?:/i.test(l)) || "";
    let role = firstMatch(text, [/ваканси[яи]\s*[:—-]\s*([^\n]{3,90})/i, /должность\s*[:—-]\s*([^\n]{3,90})/i]);
    if (!role) role = firstLine.replace(/^вакансия\s*[:—-]?\s*/i, "").slice(0, 90);
    if (role.length < 3) role = "";
    return {
      company,
      role,
      salary,
      city,
      stack,
      platform: platform === "Другое" && url ? "Сайт компании" : platform,
      url,
    };
  }

  function skillInText(alias, low) {
    const a = normalize(alias).trim();
    if (!a) return false;
    const re = new RegExp(`(^|[^a-zа-я0-9+.#])${escapeReg(a)}([^a-zа-я0-9+.#]|$)`, "i");
    return re.test(low);
  }

  function extractVacancySkills(jd, hintStack) {
    const low = ` ${normalize(jd)} `;
    const found = [];
    const seen = new Set();
    for (const item of SKILL_CATALOG) {
      if (item.aliases.some((al) => skillInText(al, low))) {
        const key = normalize(item.label);
        if (!seen.has(key)) {
          seen.add(key);
          found.push(item.label);
        }
      }
    }
    for (const h of hintStack || []) {
      const label = String(h || "").trim();
      if (label.length < 2 || label.length > 28) continue;
      const key = normalize(label);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(label);
    }
    return found;
  }

  function userHasSkill(userSkills, vacancySkill) {
    const v = normalize(vacancySkill);
    return userSkills.some((u) => {
      const un = normalize(u);
      if (!un) return false;
      if (un === v) return true;
      const cat = SKILL_CATALOG.find(
        (c) => normalize(c.label) === v || c.aliases.some((al) => normalize(al) === v),
      );
      if (cat && (normalize(cat.label) === un || cat.aliases.some((al) => normalize(al) === un))) return true;
      return false;
    });
  }

  function isProLikely() {
    try {
      const raw = localStorage.getItem("otklik-pro-v1");
      if (!raw) return false;
      const s = JSON.parse(raw);
      return Boolean(s && s.key && /^OTK[A-F0-9]{8}$/i.test(String(s.key).replace(/[^A-Z0-9]/gi, "")));
    } catch {
      return false;
    }
  }

  function analyzeVacancy(jd, skillsCsv) {
    const text = String(jd || "").trim();
    const userSkills = parseSkills(skillsCsv);
    const vacancySkills = extractVacancySkills(text, []);
    const matched = [];
    const missing = [];
    for (const vs of vacancySkills) {
      if (userHasSkill(userSkills, vs)) matched.push(vs);
      else missing.push(vs);
    }
    let score = 0;
    if (vacancySkills.length === 0) {
      const low = normalize(text);
      for (const skill of userSkills) {
        if (skillInText(skill, low)) matched.push(skill);
      }
      score = matched.length === 0 ? 0 : Math.min(100, 20 + matched.length * 12);
    } else {
      score = Math.round((matched.length / vacancySkills.length) * 100);
    }
    const hits = matched.map(normalize);
    const pro = isProLikely();
    let suggestedTpl = "fullstack";
    if (pro) {
      if (hits.some((m) => /flutter|dart/.test(m))) suggestedTpl = "pro-flutter";
      else if (hits.some((m) => /vue|php|laravel/.test(m))) suggestedTpl = "pro-vue";
      else if (score >= 70) suggestedTpl = "pro-senior";
      else if (score < 40) suggestedTpl = "pro-cold";
      else suggestedTpl = "targeted";
    } else if (hits.some((m) => /flutter|dart/.test(m))) suggestedTpl = "targeted";
    else if (hits.some((m) => /vue|react|frontend|next/.test(m)) && !hits.some((m) => /php|backend/.test(m)))
      suggestedTpl = "frontend";
    else if (matched.length >= 3) suggestedTpl = "targeted";
    else if (matched.length <= 1) suggestedTpl = "short";
    let verdict = "Слабое пересечение — либо учись под вакансию, либо пропускай.";
    if (score >= 70) verdict = "Сильный матч. Откликайся сегодня, письмо пиши под стек.";
    else if (score >= 45) verdict = "Нормальный матч. В письме выдели пересечения.";
    else if (score >= 25) verdict = "Слабовато. Откликайся только если очень хочешь компанию.";
    return { score, matched, missing: missing.slice(0, 12), suggestedTpl, verdict, vacancySkills };
  }

  function buildLinks(profile) {
    const parts = [];
    if (profile.portfolio) parts.push(`Портфолио: ${profile.portfolio}`);
    if (profile.github) parts.push(`GitHub: ${profile.github}`);
    if (profile.telegram) parts.push(`Telegram: ${profile.telegram}`);
    if (profile.email) parts.push(`Email: ${profile.email}`);
    return parts.join("\n");
  }

  function renderLetter(body, vars) {
    const profile = vars.profile || {};
    const links = buildLinks(profile);
    const matched =
      vars.matched ||
      parseSkills(profile.skills).slice(0, 6).join(", ") ||
      "мой стек";
    return String(body || "")
      .replaceAll("{{name}}", profile.name || "Кандидат")
      .replaceAll("{{role}}", profile.role || "разработчик")
      .replaceAll("{{city}}", profile.city || "")
      .replaceAll("{{company}}", vars.company || "компании")
      .replaceAll("{{vacancy}}", vars.vacancy || "вакансию")
      .replaceAll("{{matched}}", matched)
      .replaceAll("{{links}}", links || "")
      .trim();
  }

  function letterFor(templates, tplId, vars) {
    let list = templates && templates.length ? templates.slice() : DEFAULT_TEMPLATES.slice();
    if (isProLikely()) {
      const ids = new Set(list.map((t) => t.id));
      for (const t of PRO_TEMPLATES) if (!ids.has(t.id)) list.push(t);
    }
    const tpl = list.find((t) => t.id === tplId) || list.find((t) => t.id === "targeted") || list[0];
    return tpl ? renderLetter(tpl.body, vars) : "";
  }

  function buildApp({ parsed, match, profile, jd, status }) {
    const now = today();
    const st = status || "draft";
    const followDays = profile.followDays || 5;
    return {
      id: uid(),
      company: parsed.company || "Компания",
      role: parsed.role || profile.role || "Разработчик",
      platform: parsed.platform || "hh.ru",
      status: st,
      url: parsed.url || "",
      date: now,
      followUp: st === "sent" ? addDays(now, followDays) : "",
      note:
        st === "sent"
          ? match.matched.length
            ? `match ${match.score}% · ${match.matched.join(", ")}`
            : "из расширения"
          : match.matched.length
            ? `письмо готово · match ${match.score}% — отправь на площадке сам`
            : "письмо скопировано — отправь на площадке сам",
      letterTpl: match.suggestedTpl,
      updatedAt: nowIso(),
      fitScore: match.score,
      salary: parsed.salary || "",
      city: parsed.city || "",
      stack: (parsed.stack || []).join(", "),
      jdRaw: jd,
      timeline: [
        {
          id: uid(),
          at: nowIso(),
          type: st === "sent" ? "sent" : "created",
          text:
            st === "sent"
              ? "Отмечено как отправлено из расширения"
              : "Пакет из расширения: письмо в буфер, черновик — подтверди отправку на hh",
        },
      ],
    };
  }

  function mergeApps(a, b) {
    const map = new Map();
    const keyOf = (x) => {
      if (x.url) return `url:${String(x.url).split("?")[0]}`;
      if (x.id) return `id:${x.id}`;
      return `cr:${String(x.company).toLowerCase()}|${String(x.role || "").toLowerCase()}|${x.date || ""}`;
    };
    for (const x of [...(a || []), ...(b || [])]) {
      if (!x || !x.company) continue;
      const k = keyOf(x);
      const prev = map.get(k);
      if (!prev || String(x.updatedAt || "") >= String(prev.updatedAt || "")) map.set(k, x);
    }
    return [...map.values()];
  }

  function mergeTemplates(a, b) {
    const map = new Map();
    for (const t of [...DEFAULT_TEMPLATES, ...(a || []), ...(b || [])]) {
      if (!t || !t.id) continue;
      if (String(t.id).startsWith("pro-")) continue;
      map.set(t.id, t);
    }
    return [...map.values()];
  }

  function mergeState(local, remote) {
    const aTs = Number(local.syncAt || 0);
    const bTs = Number(remote.syncAt || 0);
    const newer = bTs >= aTs ? remote : local;
    const older = newer === remote ? local : remote;
    return {
      apps: mergeApps(local.apps, remote.apps),
      profile: { ...DEFAULT_PROFILE, ...(older.profile || {}), ...(newer.profile || {}) },
      templates: mergeTemplates(local.templates, remote.templates),
      syncAt: Math.max(aTs, bTs, Date.now()),
    };
  }

  async function chromeGet() {
    const raw = await chrome.storage.local.get([KEYS.apps, KEYS.profile, KEYS.templates, KEYS.sync]);
    return {
      apps: raw[KEYS.apps] || [],
      profile: raw[KEYS.profile] || null,
      templates: raw[KEYS.templates] || [],
      syncAt: raw[KEYS.sync] || 0,
    };
  }

  async function chromeSet(state) {
    const syncAt = Date.now();
    await chrome.storage.local.set({
      [KEYS.apps]: state.apps || [],
      [KEYS.profile]: state.profile || DEFAULT_PROFILE,
      [KEYS.templates]: state.templates && state.templates.length ? state.templates : DEFAULT_TEMPLATES,
      [KEYS.sync]: syncAt,
    });
    return syncAt;
  }

  function pageGet() {
    const read = (k, fb) => {
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : fb;
      } catch {
        return fb;
      }
    };
    return {
      apps: read(KEYS.apps, []),
      profile: read(KEYS.profile, null),
      templates: read(KEYS.templates, []),
      syncAt: Number(localStorage.getItem(KEYS.sync) || 0),
    };
  }

  function pageSet(state) {
    localStorage.setItem(KEYS.apps, JSON.stringify(state.apps || []));
    localStorage.setItem(KEYS.profile, JSON.stringify(state.profile || DEFAULT_PROFILE));
    localStorage.setItem(KEYS.templates, JSON.stringify(state.templates || DEFAULT_TEMPLATES));
    localStorage.setItem(KEYS.sync, String(state.syncAt || Date.now()));
  }

  function txt(sel, root) {
    const el = (root || document).querySelector(sel);
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function scrapePage() {
    const host = location.hostname;
    const url = location.href.split("?")[0];
    let role = "";
    let company = "";
    let salary = "";
    let city = "";
    let description = "";
    let platform = "Другое";

    if (/hh\.ru$/.test(host) || host.endsWith(".hh.ru")) {
      platform = "hh.ru";
      role = txt('[data-qa="vacancy-title"]') || txt("h1");
      company = txt('[data-qa="vacancy-company-name"]');
      salary =
        txt('[data-qa="vacancy-salary"]') ||
        txt('[data-qa="vacancy-salary-compensation-container"]') ||
        txt('[data-qa="vacancy-compensation"]');
      city =
        txt('[data-qa="vacancy-view-location"]') ||
        txt('[data-qa="vacancy-view-raw-address"]') ||
        txt('[data-qa="vacancy-view-location-label"]');
      description =
        txt('[data-qa="vacancy-description"]') ||
        txt(".vacancy-description") ||
        txt('[itemprop="description"]');
    } else if (host.includes("career.habr.com")) {
      platform = "Хабр Карьера";
      role = txt("h1") || txt(".page-title");
      company =
        txt(".company_name") ||
        txt(".vacancy-company-name") ||
        txt("a[href*='/companies/']") ||
        txt(".content-wrapper a[href*='companies']");
      salary = txt(".salary") || txt(".vacancy-salary") || txt("[class*='salary']");
      city = txt(".location") || txt(".vacancy-location");
      description = txt(".vacancy-description") || txt(".style-ugc") || txt("[class*='description']");
    } else {
      role = txt("h1");
      description = (document.body.innerText || "").slice(0, 8000);
    }

    const jd = [
      role,
      company ? `Компания: ${company}` : "",
      url,
      salary ? `Зарплата: ${salary}` : "",
      city ? `Город: ${city}` : "",
      "",
      description,
    ]
      .filter(Boolean)
      .join("\n");

    const parsed = parseVacancy(jd);
    parsed.role = parsed.role || role;
    parsed.company = parsed.company || company;
    parsed.salary = parsed.salary || salary;
    parsed.city = parsed.city || city;
    parsed.platform = platform;
    parsed.url = url;
    return { parsed, jd, role, company, salary, city, platform, url };
  }

  function findLetterBox() {
    const sels = [
      'textarea[data-qa="vacancy-response-popup-form-letter-input"]',
      'textarea[data-qa="vacancy-response-letter"]',
      'textarea[name="letter"]',
      'textarea[placeholder*="сопровод" i]',
      'textarea[placeholder*="письмо" i]',
      "textarea",
    ];
    for (const s of sels) {
      const nodes = [...document.querySelectorAll(s)];
      const vis = nodes.find((n) => n.offsetParent !== null && n.getBoundingClientRect().height > 40);
      if (vis) return vis;
    }
    return null;
  }

  function fillLetterBox(text) {
    const box = findLetterBox();
    if (!box) return false;
    box.focus();
    const proto = Object.getPrototypeOf(box);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(box, text);
    else box.value = text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function highlightApply() {
    const btn =
      document.querySelector('[data-qa="vacancy-response-link-top"]') ||
      document.querySelector('[data-qa="vacancy-response-link"]') ||
      document.querySelector('a[href*="response"]') ||
      [...document.querySelectorAll("button, a")].find((el) => /откликнуться/i.test(el.textContent || ""));
    if (!btn) return false;
    btn.classList.add("otklik-highlight-apply");
    btn.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
  }

  root.OtklikCore = {
    KEYS,
    DEFAULT_PROFILE,
    DEFAULT_TEMPLATES,
    parseVacancy,
    analyzeVacancy,
    letterFor,
    buildApp,
    mergeState,
    chromeGet,
    chromeSet,
    pageGet,
    pageSet,
    scrapePage,
    fillLetterBox,
    highlightApply,
    findLetterBox,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
