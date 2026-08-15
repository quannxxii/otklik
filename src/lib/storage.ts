import type { Application, LetterTemplate, Profile, Status, TimelineType } from "../types";
import { DEFAULT_PROFILE, DEFAULT_TEMPLATES, STATUS_ORDER } from "../types";
import { notifyWebChanged } from "./ext-sync";
import { stripProTemplates } from "./pro";

const APPS_KEY = "otklik-apps-v1";
const PROFILE_KEY = "otklik-profile-v1";
const TPL_KEY = "otklik-templates-v1";
const PLATFORMS_DONE_KEY = "otklik-platforms-done-v1";
const SYNC_KEY = "otklik-sync-at";

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Local calendar date (avoids UTC midnight shift for MSK). */
export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return today(d);
}

export function daysBetween(a: string, b: string) {
  const x = new Date(`${a}T12:00:00`).getTime();
  const y = new Date(`${b}T12:00:00`).getTime();
  return Math.floor((y - x) / 86400000);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(SYNC_KEY, String(Date.now()));
    notifyWebChanged();
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    if (quota) {
      console.error("otklik: localStorage quota exceeded");
      throw new Error("Память браузера переполнена. Скачай бэкап и удали старые отклики с длинным JD.");
    }
    throw e;
  }
}

const STATUS_SET = new Set<string>(STATUS_ORDER);

export function isApplication(x: unknown): x is Application {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.company === "string" &&
    a.company.trim().length > 0 &&
    typeof a.role === "string" &&
    typeof a.status === "string" &&
    STATUS_SET.has(a.status as Status)
  );
}

export function sanitizeApps(raw: unknown): Application[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isApplication).map((a) => ({
    ...a,
    platform: String(a.platform || "Другое"),
    url: String(a.url || ""),
    date: String(a.date || today()),
    followUp: String(a.followUp || ""),
    note: String(a.note || ""),
    letterTpl: String(a.letterTpl || "fullstack"),
    updatedAt: String(a.updatedAt || a.date || today()),
    timeline: Array.isArray(a.timeline) ? a.timeline : undefined,
  }));
}

export function loadApps(): Application[] {
  return sanitizeApps(read<unknown>(APPS_KEY, [])).map((a) => ({
    ...a,
    timeline: a.timeline?.length
      ? a.timeline
      : [
          {
            id: uid(),
            at: a.date || today(),
            type: (a.status === "draft" ? "created" : a.status) as TimelineType,
            text: a.status,
          },
        ],
  }));
}

export function saveApps(apps: Application[]) {
  write(APPS_KEY, apps);
}

export function loadProfile(): Profile {
  const saved = read<Partial<Profile>>(PROFILE_KEY, {});
  return {
    ...DEFAULT_PROFILE,
    ...saved,
    onboardingDone: saved.onboardingDone ?? Boolean(saved.name?.trim()),
    notifyFollowUps: saved.notifyFollowUps ?? true,
  };
}

export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile);
}

export function loadTemplates(): LetterTemplate[] {
  const saved = read<LetterTemplate[] | null>(TPL_KEY, null);
  const list = saved?.length ? saved : DEFAULT_TEMPLATES;
  return stripProTemplates(list);
}

export function saveTemplates(templates: LetterTemplate[]) {
  write(TPL_KEY, stripProTemplates(templates));
}

export function loadPlatformsDone(): Record<string, boolean> {
  return read(PLATFORMS_DONE_KEY, {});
}

export function savePlatformsDone(done: Record<string, boolean>) {
  write(PLATFORMS_DONE_KEY, done);
}

export function needsFollowUp(app: Application, followDays: number, now = today()) {
  if (!["sent", "draft"].includes(app.status)) return false;
  if (app.followUp && app.followUp <= now) return true;
  if (app.status === "sent" && daysBetween(app.date, now) >= followDays) return true;
  return false;
}

export function buildLinks(profile: Profile) {
  const parts: string[] = [];
  if (profile.portfolio) parts.push(`Портфолио: ${profile.portfolio}`);
  if (profile.github) parts.push(`GitHub: ${profile.github}`);
  if (profile.telegram) parts.push(`Telegram: ${profile.telegram}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  return parts.join("\n");
}

export function renderLetter(
  body: string,
  vars: { company: string; vacancy: string; profile: Profile; matched?: string },
) {
  const links = buildLinks(vars.profile);
  const matched =
    vars.matched ||
    (vars.profile.skills
      ? vars.profile.skills
          .split(/[,;/|]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6)
          .join(", ")
      : "мой стек");
  return body
    .replaceAll("{{name}}", vars.profile.name || "Кандидат")
    .replaceAll("{{role}}", vars.profile.role || "разработчик")
    .replaceAll("{{city}}", vars.profile.city || "")
    .replaceAll("{{company}}", vars.company || "компании")
    .replaceAll("{{vacancy}}", vars.vacancy || "вакансию")
    .replaceAll("{{matched}}", matched)
    .replaceAll("{{links}}", links || "")
    .replaceAll("{{portfolio}}", vars.profile.portfolio || "")
    .replaceAll("{{github}}", vars.profile.github || "")
    .replaceAll("{{telegram}}", vars.profile.telegram || "")
    .replaceAll("{{email}}", vars.profile.email || "")
    .trim();
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function downloadText(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type BackupPayload = {
  profile?: Partial<Profile>;
  templates?: LetterTemplate[];
  apps?: Application[];
  version?: number;
};

export function parseBackup(raw: string): BackupPayload {
  const data = JSON.parse(raw) as BackupPayload;
  if (!data || typeof data !== "object") throw new Error("Не похоже на бэкап Отклик");
  return data;
}

export function appsToCsv(apps: Application[]) {
  const header = [
    "date",
    "company",
    "role",
    "platform",
    "status",
    "url",
    "followUp",
    "note",
    "letterTpl",
    "fitScore",
    "salary",
    "contact",
    "interviewNotes",
    "city",
    "stack",
    "interviewAt",
    "testDeadline",
    "rejectReason",
  ];
  const rows = apps.map((a) =>
    header
      .map((k) => {
        const raw = a[k as keyof Application];
        const v = raw == null ? "" : String(raw);
        return `"${v.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
