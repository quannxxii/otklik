const MSG_FROM_EXT = "OTKLIK_EXT_STATE";
const MSG_FROM_WEB = "OTKLIK_WEB_CHANGED";
const MSG_PING = "OTKLIK_WEB_PING";
const MSG_PONG = "OTKLIK_EXT_PONG";

export type ExtSyncStatus = "checking" | "ok" | "offline";

function isOtklikOrigin(origin: string) {
  if (!origin || origin === "null") return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return (
      host === "otklik-gamma.vercel.app" ||
      (host.endsWith(".vercel.app") && host.includes("otklik")) ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function fromExt(e: MessageEvent) {
  if (e.source !== window) return false;
  if (!isOtklikOrigin(e.origin) && e.origin !== window.location.origin) return false;
  return Boolean(e.data && typeof e.data.type === "string");
}

export function notifyWebChanged() {
  try {
    window.postMessage({ type: MSG_FROM_WEB }, window.location.origin);
  } catch {
    /* ignore */
  }
}

export function pingExtension() {
  try {
    window.postMessage({ type: MSG_PING }, window.location.origin);
  } catch {
    /* ignore */
  }
}

export function subscribeExtensionSync(
  onState: (state: { apps?: unknown; profile?: unknown; templates?: unknown }) => void,
) {
  const onMsg = (e: MessageEvent) => {
    if (!fromExt(e)) return;
    if (e.data.type === MSG_FROM_EXT && e.data.state) onState(e.data.state);
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}

export function subscribeExtPresence(onStatus: (status: ExtSyncStatus) => void) {
  let lastOk = 0;
  const markOk = () => {
    lastOk = Date.now();
    onStatus("ok");
  };
  const onMsg = (e: MessageEvent) => {
    if (!fromExt(e)) return;
    if (e.data.type === MSG_PONG || (e.data.type === MSG_FROM_EXT && e.data.state)) markOk();
  };
  window.addEventListener("message", onMsg);
  pingExtension();
  const boot = window.setTimeout(() => {
    if (!lastOk) onStatus("offline");
  }, 2800);
  const tick = window.setInterval(() => {
    pingExtension();
    if (lastOk && Date.now() - lastOk > 12000) onStatus("offline");
  }, 7000);
  return () => {
    window.removeEventListener("message", onMsg);
    window.clearTimeout(boot);
    window.clearInterval(tick);
  };
}
