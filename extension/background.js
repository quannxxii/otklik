importScripts("lib/core.js");

const C = self.OtklikCore;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "GET_STATE") {
        const state = await C.chromeGet();
        sendResponse({
          ok: true,
          state: {
            apps: state.apps || [],
            profile: { ...C.DEFAULT_PROFILE, ...(state.profile || {}) },
            templates: state.templates && state.templates.length ? state.templates : C.DEFAULT_TEMPLATES,
          },
        });
        return;
      }
      if (msg.type === "SAVE_APP") {
        const state = await C.chromeGet();
        const apps = C.mergeState(state, { apps: [msg.app], profile: state.profile, templates: state.templates, syncAt: 0 }).apps;
        await C.chromeSet({
          apps,
          profile: { ...C.DEFAULT_PROFILE, ...(state.profile || {}) },
          templates: state.templates && state.templates.length ? state.templates : C.DEFAULT_TEMPLATES,
        });
        sendResponse({ ok: true, count: apps.length });
        return;
      }
      if (msg.type === "MARK_SENT") {
        const state = await C.chromeGet();
        const apps = C.markAppSent(state.apps || [], msg.id, (state.profile && state.profile.followDays) || 5);
        if (!apps) {
          sendResponse({ ok: false, error: "черновик не найден" });
          return;
        }
        await C.chromeSet({
          apps,
          profile: { ...C.DEFAULT_PROFILE, ...(state.profile || {}) },
          templates: state.templates && state.templates.length ? state.templates : C.DEFAULT_TEMPLATES,
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "MERGE_STATE") {
        const chromeState = await C.chromeGet();
        const merged = C.mergeState(chromeState, msg.state || {});
        await C.chromeSet(merged);
        sendResponse({ ok: true, state: merged });
        return;
      }
      sendResponse({ ok: false, error: "unknown" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  })();
  return true;
});
