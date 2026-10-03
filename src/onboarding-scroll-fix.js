const appRoot = document.querySelector("#app");
let pendingSeedScrollTop = null;

function getSeedPanel() {
  return document.querySelector(".seed-panel");
}

function restoreSeedScroll() {
  if (pendingSeedScrollTop == null) return;
  const panel = getSeedPanel();
  if (!panel) return;

  const top = pendingSeedScrollTop;
  pendingSeedScrollTop = null;

  requestAnimationFrame(() => {
    panel.scrollTop = top;
    requestAnimationFrame(() => {
      panel.scrollTop = top;
    });
  });
}

// Capture the scroll position before app.js re-renders the onboarding markup.
document.addEventListener("click", (event) => {
  const target = event.target.closest('[data-action="select-seed"]');
  if (!target) return;

  const panel = getSeedPanel();
  if (!panel) return;
  pendingSeedScrollTop = panel.scrollTop;

  setTimeout(restoreSeedScroll, 0);
}, true);

if (appRoot) {
  new MutationObserver(() => {
    if (pendingSeedScrollTop != null) restoreSeedScroll();
  }).observe(appRoot, { childList: true, subtree: true });
}
