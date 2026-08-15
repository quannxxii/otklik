const MSG_FROM_EXT = "OTKLIK_EXT_STATE";
const MSG_FROM_WEB = "OTKLIK_WEB_CHANGED";

function isOtklikOrigin(origin: string) {
  if (!origin || origin === "null") return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    return (
      host === "otklik-gamma.vercel.app" ||
      host.endsWith(".vercel.app") && host.includes("otklik") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export function notifyWebChanged() {
  try {
    window.postMessage({ type: MSG_FROM_WEB }, window.location.origin);
  } catch {
    /* ignore */
  }
}

export function subscribeExtensionSync(
  onState: (state: { apps?: unknown; profile?: unknown; templates?: unknown }) => void,
) {
  const onMsg = (e: MessageEvent) => {
    if (e.source !== window) return;
    if (!isOtklikOrigin(e.origin) && e.origin !== window.location.origin) return;
    if (e.data && e.data.type === MSG_FROM_EXT && e.data.state) onState(e.data.state);
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}
