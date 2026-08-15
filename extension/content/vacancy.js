const C = globalThis.OtklikCore;

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function mount() {
  if (document.getElementById("otklik-root")) return;
  const root = el(`
    <div id="otklik-root">
      <div class="otklik-panel" id="otklik-panel">
        <h3>Отклик</h3>
        <p class="otklik-muted">Письмо и трекер. Отправку на площадке подтверждаешь ты.</p>
        <div class="otklik-score" id="otklik-score">—</div>
        <p class="otklik-verdict" id="otklik-verdict">Открой панель на вакансии.</p>
        <div class="otklik-meta" id="otklik-meta"></div>
        <div class="otklik-tags" id="otklik-tags"></div>
        <div class="otklik-actions">
          <button type="button" class="otklik-btn accent" id="otklik-pack">Пакет: письмо + трекер</button>
          <button type="button" class="otklik-btn ghost" id="otklik-copy">Только письмо</button>
          <button type="button" class="otklik-btn ghost" id="otklik-draft">Черновик</button>
          <button type="button" class="otklik-btn ghost" id="otklik-fill">В форму</button>
        </div>
        <p class="otklik-toast" id="otklik-toast"></p>
      </div>
      <button type="button" class="otklik-fab" id="otklik-fab" title="Отклик">О</button>
    </div>
  `);
  document.documentElement.appendChild(root);

  const panel = root.querySelector("#otklik-panel");
  const toast = root.querySelector("#otklik-toast");
  root.querySelector("#otklik-fab").onclick = () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) refresh();
  };

  async function ask(type, extra) {
    return chrome.runtime.sendMessage({ type, ...extra });
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }
  }

  function show(msg, warn) {
    toast.textContent = msg;
    toast.classList.toggle("otklik-warn", Boolean(warn));
  }

  async function context() {
    const scraped = C.scrapePage();
    const res = await ask("GET_STATE");
    const state = res && res.state ? res.state : { profile: C.DEFAULT_PROFILE, templates: C.DEFAULT_TEMPLATES, apps: [] };
    const profile = { ...C.DEFAULT_PROFILE, ...(state.profile || {}) };
    const match = C.analyzeVacancy(scraped.jd, profile.skills);
    const parsed = scraped.parsed;
    const letter = C.letterFor(state.templates, match.suggestedTpl, {
      company: parsed.company,
      vacancy: parsed.role,
      profile,
      matched: match.matched.join(", "),
    });
    const dup = (state.apps || []).some(
      (a) => a.url === parsed.url || (a.company && parsed.company && a.company.toLowerCase() === parsed.company.toLowerCase() && a.role === parsed.role),
    );
    return { scraped, state, profile, match, parsed, letter, dup };
  }

  async function refresh() {
    try {
      const ctx = await context();
      root.querySelector("#otklik-score").textContent = `${ctx.match.score}%`;
      root.querySelector("#otklik-verdict").textContent = ctx.match.verdict;
      root.querySelector("#otklik-meta").innerHTML = `
        <div>${esc(ctx.parsed.role || "роль?")}</div>
        <div>${esc(ctx.parsed.company || "компания?")}</div>
        <div>${esc(ctx.parsed.salary || "вилка —")} · ${esc(ctx.parsed.city || "город —")}</div>
        ${ctx.dup ? "<div>уже есть в трекере</div>" : ""}
        ${ctx.profile.onboardingDone || ctx.profile.name ? "" : "<div>открой Отклик и заполни профиль — тогда письмо будет твоим</div>"}
      `;
      root.querySelector("#otklik-tags").innerHTML = ctx.match.matched
        .slice(0, 8)
        .map((m) => `<span class="otklik-tag">${esc(m)}</span>`)
        .join("");
      show("");
    } catch (e) {
      show(String(e.message || e), true);
    }
  }

  async function save(status, doCopy, doFill) {
    const ctx = await context();
    if (doCopy) await copy(ctx.letter);
    if (doFill) {
      const ok = C.fillLetterBox(ctx.letter);
      if (!ok) show("Поля письма на странице нет — сначала нажми «Откликнуться» у hh, потом «В форму».", true);
    }
    if (ctx.dup && status !== "draft") {
      show("Такой отклик уже в трекере. Письмо скопировано — отправь вручную.");
      C.highlightApply();
      return;
    }
    const app = C.buildApp({
      parsed: ctx.parsed,
      match: ctx.match,
      profile: ctx.profile,
      jd: ctx.scraped.jd,
      status,
    });
    const res = await ask("SAVE_APP", { app });
    if (!res || !res.ok) {
      show(res && res.error ? res.error : "Не записалось. Открой https://otklik-gamma.vercel.app один раз для синка.", true);
      return;
    }
    C.highlightApply();
    const extra = doCopy ? " Письмо в буфере." : "";
    show(
      status === "sent"
        ? `Записано как отправлено.${extra}`
        : `Черновик в трекере.${extra} На hh жми «Откликнуться» сам.`,
    );
  }

  root.querySelector("#otklik-pack").onclick = () => void save("draft", true, true);
  root.querySelector("#otklik-copy").onclick = async () => {
    const ctx = await context();
    await copy(ctx.letter);
    show("Письмо в буфере. На hh жми «Откликнуться» сам.");
  };
  root.querySelector("#otklik-draft").onclick = () => void save("draft", false, false);
  root.querySelector("#otklik-fill").onclick = async () => {
    const ctx = await context();
    await copy(ctx.letter);
    const ok = C.fillLetterBox(ctx.letter);
    show(
      ok ? "Вставил в форму. Отправку подтверждаешь ты." : "Сначала открой форму «Откликнуться», потом «В форму».",
      !ok,
    );
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
