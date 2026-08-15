const MSG_FROM_EXT = "OTKLIK_EXT_STATE";
const MSG_FROM_WEB = "OTKLIK_WEB_CHANGED";

export function notifyWebChanged() {
  try {
    window.postMessage({ type: MSG_FROM_WEB }, "*");
  } catch {
    /* ignore */
  }
}

export function subscribeExtensionSync(onState: (state: { apps?: unknown; profile?: unknown; templates?: unknown }) => void) {
  const onMsg = (e: MessageEvent) => {
    if (e.source !== window) return;
    if (e.data && e.data.type === MSG_FROM_EXT && e.data.state) onState(e.data.state);
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}
