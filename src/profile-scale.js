const appRoot = document.querySelector("#app");
let queued = false;

function normalizeProfileScores() {
  document.querySelectorAll(".profile-row, .big-profile-row").forEach((row) => {
    const fill = row.querySelector("i");
    const value = row.querySelector("b");
    if (!fill || !value) return;

    const rawWidth = fill.style.width || getComputedStyle(fill).width;
    const percentage = Number.parseFloat(rawWidth);
    if (!Number.isFinite(percentage)) return;

    const normalized = Math.max(0, Math.min(100, Math.round(percentage)));
    value.textContent = String(normalized);
    value.setAttribute("aria-label", `Afinidade relativa ${normalized} de 100`);
    value.title = `Afinidade relativa: ${normalized}/100`;
  });

  const heroLabel = document.querySelector(".hero-profile > span");
  if (heroLabel) heroLabel.textContent = "Perfil inferido agora • escala relativa 0–100";

  const xrayLabel = document.querySelector(".dashboard-card.span-5 .card-head small");
  if (xrayLabel) xrayLabel.textContent = "afinidade relativa • escala 0–100";
}

function scheduleNormalization() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    normalizeProfileScores();
  });
}

if (appRoot) {
  new MutationObserver(scheduleNormalization).observe(appRoot, { childList: true, subtree: true });
}

scheduleNormalization();
