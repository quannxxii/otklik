const C = globalThis.OtklikCore;
let pushing = false;
let queue = Promise.resolve();

function enqueue(fn) {
  queue = queue.then(fn).catch(() => {});
  return queue;
}

async function syncFromPage() {
  return enqueue(async () => {
    if (pushing) return;
    pushing = true;
    try {
      const page = C.pageGet();
      const chromeState = await C.chromeGet();
      const merged = C.mergeState(chromeState, page);
      await C.chromeSet(merged);
      const same =
        JSON.stringify(page.apps) === JSON.stringify(merged.apps) &&
        JSON.stringify(page.profile) === JSON.stringify(merged.profile) &&
        JSON.stringify(page.templates) === JSON.stringify(merged.templates);
      if (!same) {
        C.pageSet(merged);
        window.postMessage({ type: "OTKLIK_EXT_STATE", state: merged }, window.location.origin);
      }
    } finally {
      pushing = false;
    }
  });
}

async function syncFromChrome() {
  return enqueue(async () => {
    if (pushing) return;
    pushing = true;
    try {
      const chromeState = await C.chromeGet();
      const page = C.pageGet();
      const merged = C.mergeState(page, chromeState);
      const same =
        JSON.stringify(page.apps) === JSON.stringify(merged.apps) &&
        JSON.stringify(page.profile) === JSON.stringify(merged.profile) &&
        JSON.stringify(page.templates) === JSON.stringify(merged.templates);
      if (!same) {
        C.pageSet(merged);
        window.postMessage({ type: "OTKLIK_EXT_STATE", state: merged }, window.location.origin);
      }
      await C.chromeSet(merged);
    } finally {
      pushing = false;
    }
  });
}

window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (e.origin !== window.location.origin) return;
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
