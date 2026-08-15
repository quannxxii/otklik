import type { Application } from "../types";
import { needsFollowUp, today } from "./storage";

const NOTIFY_KEY = "otklik-last-notify-day";

export async function ensureNotifyPermission() {
  if (!("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return (await Notification.requestPermission()) as NotificationPermission;
}

export function maybeNotifyFollowUps(apps: Application[], followDays: number, enabled: boolean) {
  if (!enabled || !("Notification" in window) || Notification.permission !== "granted") return;
  if (localStorage.getItem(NOTIFY_KEY) === today()) return;

  const due = apps.filter((a) => needsFollowUp(a, followDays));
  if (!due.length) {
    localStorage.setItem(NOTIFY_KEY, today());
    return;
  }

  const top = due.slice(0, 3).map((a) => a.company).join(", ");
  const more = due.length > 3 ? ` и ещё ${due.length - 3}` : "";
  new Notification("Отклик · пора follow-up", {
    body: `${due.length}: ${top}${more}`,
    tag: "otklik-followups",
  });
  localStorage.setItem(NOTIFY_KEY, today());
}
