const C = globalThis.OtklikCore;
let pushing = false;

async function syncFromPage() {
  if (pushing) return;
  const page = C.pageGet();
  const chromeState = await C.chromeGet();
  const merged = C.mergeState(chromeState, page);
  pushing = true;
  try {
    await C.chromeSet(merged);
    const same =
      JSON.stringify(page.apps) === JSON.stringify(merged.apps) &&
      JSON.stringify(page.profile) === JSON.stringify(merged.profile);
    if (!same) {
      C.pageSet(merged);
      window.postMessage({ type: "OTKLIK_EXT_STATE", state: merged }, "*");
    }
  } finally {
    pushing = false;
  }
}

async function syncFromChrome() {
  if (pushing) return;
  const chromeState = await C.chromeGet();
  const page = C.pageGet();
  const merged = C.mergeState(page, chromeState);
  const same =
    JSON.stringify(page.apps) === JSON.stringify(merged.apps) &&
    JSON.stringify(page.profile) === JSON.stringify(merged.profile);
  pushing = true;
  try {
    if (!same) {
      C.pageSet(merged);
      window.postMessage({ type: "OTKLIK_EXT_STATE", state: merged }, "*");
    }
    await C.chromeSet(merged);
  } finally {
    pushing = false;
  }
}

window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (e.data && e.data.type === "OTKLIK_WEB_CHANGED") void syncFromPage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[C.KEYS.apps] || changes[C.KEYS.profile] || changes[C.KEYS.templates]) {
    void syncFromChrome();
  }
});

void syncFromChrome();
setInterval(() => {
  void syncFromPage();
}, 2500);
