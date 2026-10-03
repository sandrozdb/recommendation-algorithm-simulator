const STORAGE_KEY = "recommendation-lab-state-v1";
const appRoot = document.querySelector("#app");
let polishQueued = false;

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function updateHeroMessage() {
  const state = readState();
  if (!state?.seeded) return;

  const eyebrow = document.querySelector(".hero-copy .eyebrow");
  if (!eyebrow) return;

  const newSignals = Array.isArray(state.interactions)
    ? state.interactions.filter((interaction) => interaction.type !== "seed").length
    : 0;

  if (newSignals === 0) {
    eyebrow.textContent = "SEU PRIMEIRO RANKING FOI CRIADO";
    return;
  }

  eyebrow.textContent = `SEU RANKING MUDOU COM ${newSignals} ${newSignals === 1 ? "NOVO SINAL" : "NOVOS SINAIS"}`;
}

function explainAffinityScale() {
  const profile = document.querySelector(".dashboard-card.span-5 .big-profile");
  const card = profile?.closest(".dashboard-card");
  if (!card || card.querySelector(".affinity-scale-note")) return;

  const note = document.createElement("p");
  note.className = "affinity-scale-note";
  note.innerHTML = "<strong>Como ler:</strong> 100 = interesse mais forte neste perfil agora • não significa 100% de certeza.";

  const head = card.querySelector(".card-head");
  if (head) head.insertAdjacentElement("afterend", note);
  else card.prepend(note);
}

function labelColdStartSignals() {
  document.querySelectorAll(".timeline-item strong").forEach((label) => {
    if (label.textContent?.trim() !== "Escolheu no início") return;
    label.textContent = "Cold start • escolha inicial";
    label.closest(".timeline-item")?.classList.add("cold-start-signal");
  });
}

function showRecalculatedBanner() {
  let banner = document.querySelector(".ranking-recalculated-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "ranking-recalculated-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    document.body.append(banner);
  }

  banner.textContent = "Novo sinal recebido → ranking recalculado";
  banner.classList.remove("visible");
  requestAnimationFrame(() => banner.classList.add("visible"));

  clearTimeout(showRecalculatedBanner.timer);
  showRecalculatedBanner.timer = setTimeout(() => banner.classList.remove("visible"), 2200);
}

function polishPresentation() {
  updateHeroMessage();
  explainAffinityScale();
  labelColdStartSignals();
}

function schedulePolish() {
  if (polishQueued) return;
  polishQueued = true;
  requestAnimationFrame(() => {
    polishQueued = false;
    polishPresentation();
  });
}

if (appRoot) {
  new MutationObserver(schedulePolish).observe(appRoot, { childList: true, subtree: true });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.dataset.action !== "interact") return;
  setTimeout(() => {
    showRecalculatedBanner();
    schedulePolish();
  }, 0);
});

schedulePolish();
