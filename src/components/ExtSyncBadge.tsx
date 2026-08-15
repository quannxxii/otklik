import { Link } from "react-router-dom";
import type { ExtSyncStatus } from "../lib/ext-sync";

const LABEL: Record<ExtSyncStatus, string> = {
  checking: "синк…",
  ok: "синк · ок",
  offline: "расширение выкл",
};

type Props = { status: ExtSyncStatus; compact?: boolean };

export function ExtSyncBadge({ status, compact }: Props) {
  if (compact) {
    return (
      <Link
        to="/app/settings"
        className={`ext-sync-badge ${status}`}
        title={status === "ok" ? "Расширение подключено" : "Установи расширение и открой этот сайт"}
      >
        {LABEL[status]}
      </Link>
    );
  }
  return (
    <p className={`ext-sync-line ${status}`}>
      {status === "ok" && "Расширение подключено. Трекер на hh и на сайте — одни данные."}
      {status === "checking" && "Проверяю расширение…"}
      {status === "offline" && (
        <>
          Расширение не видно. Установи из папки <code>extension</code> и обнови эту вкладку — иначе пакет на hh не
          подтянет профиль.
        </>
      )}
    </p>
  );
}
