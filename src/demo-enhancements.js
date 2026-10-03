import { CONTENT } from "./data.js";
import { inferProfile, rankContent } from "./recommender.js";

const STORAGE_KEY = "recommendation-lab-state-v1";
const appRoot = document.querySelector("#app");
const contentById = new Map(CONTENT.map((item) => [item.id, item]));

let activeDetailsId = null;
let movementSnapshot = null;
let movementState = null;
let enhanceQueued = false;

function safeReadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Recommendation Lab: localStorage indisponível.", error);
    return null;
  }
}

function hardenStorage() {
  if (typeof Storage === "undefined") return;
  const proto = Storage.prototype;
  if (proto.__recommendationLabHardened) return;

  const nativeSetItem = proto.setItem;
  const nativeRemoveItem = proto.removeItem;

  try {
    proto.setItem = function setItemSafe(key, value) {
      try {
        return nativeSetItem.call(this, key, value);
      } catch (error) {
        console.warn("Recommendation Lab: não foi possível salvar o estado.", error);
        return undefined;
      }
    };
    proto.removeItem = function removeItemSafe(key) {
      try {
        return nativeRemoveItem.call(this, key);
      } catch (error) {
        console.warn("Recommendation Lab: não foi possível limpar o estado.", error);
        return undefined;
      }
    };
    Object.defineProperty(proto, "__recommendationLabHardened", { value: true });
  } catch (error) {
    console.warn("Recommendation Lab: proteção de storage não pôde ser aplicada.", error);
  }
}

function titleCase(value) {
  return String(value)
    .replaceAll("-", " ")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

const TAG_LABELS = {
  "anos-2000": "Anos 2000",
  adolescência: "Conteúdo adolescente",
  escola: "Histórias de escola",
  romance: "Romance",
  música: "Música",
  família: "Família",
  carreira: "Carreira",
  relacionamentos: "Relacionamentos",
  amizade: "Amizade",
  comédia: "Comédia",
  "nova-york": "Vida em Nova York",
  competição: "Competição",
  tecnologia: "Tecnologia",
  mistério: "Mistério"
};

function getHumanInference(state) {
  if (!state?.interactions?.length) return [];
  const profile = inferProfile(state);
  const labels = [];

  profile.genres
    .filter((entry) => entry.value > 0)
    .slice(0, 2)
    .forEach((entry) => labels.push(entry.name));

  const tagEntries = [...profile.features.entries()]
    .filter(([key, value]) => key.startsWith("tag:") && value > 0)
    .map(([key, value]) => ({ tag: key.slice(4), value }))
    .filter(({ tag }) => tag !== "hilary-duff")
    .sort((a, b) => b.value - a.value);

  for (const { tag } of tagEntries) {
    const label = TAG_LABELS[tag] || titleCase(tag);
    if (!labels.some((current) => current.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"))) {
      labels.push(label);
    }
    if (labels.length >= 4) break;
  }

  return labels.slice(0, 4);
}

function renderInferenceBox(state) {
  const labels = getHumanInference(state);
  if (!labels.length) return null;
  const box = document.createElement("div");
  box.className = "human-inference";
  box.innerHTML = `
    <span class="inference-kicker">O SISTEMA ESTÁ INFERINDO</span>
    <strong>${labels.join(" • ")}</strong>
    <small>Inferência didática feita a partir das escolhas e interações — você não precisou declarar essas preferências.</small>
  `;
  return box;
}

function injectHumanInference() {
  const state = safeReadState();
  if (!state?.seeded) return;

  const heroProfile = document.querySelector(".hero-profile");
  if (heroProfile && !heroProfile.querySelector(".human-inference")) {
    const box = renderInferenceBox(state);
    if (box) heroProfile.append(box);
  }

  const xrayProfile = document.querySelector(".dashboard-card.span-5 .big-profile");
  if (xrayProfile && !xrayProfile.parentElement.querySelector(".human-inference")) {
    const box = renderInferenceBox(state);
    if (box) xrayProfile.insertAdjacentElement("afterend", box);
  }
}

function getCurrentModalItem() {
  if (activeDetailsId && contentById.has(activeDetailsId)) return contentById.get(activeDetailsId);
  const title = document.querySelector("#modal-title")?.textContent?.trim();
  if (!title) return null;
  return CONTENT.find((item) => item.title === title) || null;
}

function buildWhyText(item, state) {
  if (!item || !state) return "Esta recomendação combina sinais do seu perfil atual com popularidade e exploração.";
  const profile = inferProfile(state);
  const positiveGenres = profile.genres.filter((entry) => entry.value > 0).slice(0, 5).map((entry) => entry.name);
  const genreReasons = item.genres.filter((genre) => positiveGenres.includes(genre)).slice(0, 2);
  const tagReasons = item.tags
    .filter((tag) => tag !== "hilary-duff")
    .filter((tag) => (profile.features.get(`tag:${tag}`) || 0) > 0)
    .map((tag) => TAG_LABELS[tag] || titleCase(tag))
    .slice(0, 2);

  const reasons = [...new Set([...genreReasons, ...tagReasons])].slice(0, 3);
  if (reasons.length) {
    return `Recomendado porque suas escolhas indicam interesse em ${reasons.join(", ")}.`;
  }
  return "Este título entrou no ranking principalmente por popularidade e pela exploração de conteúdos fora do seu padrão atual.";
}

function injectWhyExplanation() {
  const whyBlock = document.querySelector(".why-block");
  if (!whyBlock || whyBlock.querySelector(".why-explanation")) return;
  const item = getCurrentModalItem();
  const state = safeReadState();
  const explanation = document.createElement("p");
  explanation.className = "why-explanation";
  explanation.textContent = buildWhyText(item, state);
  const title = whyBlock.querySelector(".why-title");
  if (title) title.insertAdjacentElement("afterend", explanation);
  else whyBlock.prepend(explanation);
}

function captureRanking() {
  const state = safeReadState();
  if (!state?.seeded) return null;
  try {
    return rankContent(state).map(({ item }) => item.id);
  } catch (error) {
    console.warn("Recommendation Lab: não foi possível capturar o ranking anterior.", error);
    return null;
  }
}

function calculateMovement(before, after) {
  if (!before || !after) return new Map();
  const beforeIndex = new Map(before.map((id, index) => [id, index]));
  const movement = new Map();
  after.forEach((id, newIndex) => {
    const oldIndex = beforeIndex.get(id);
    if (oldIndex == null) return;
    const delta = oldIndex - newIndex;
    if (delta !== 0) movement.set(id, delta);
  });
  return movement;
}

function decorateMovement() {
  if (!movementState || Date.now() > movementState.expiresAt) return;
  document.querySelectorAll(".poster-card[data-id]").forEach((card) => {
    const id = card.dataset.id;
    const delta = movementState.map.get(id);
    if (!delta || card.querySelector(".movement-chip")) return;
    const art = card.querySelector(".poster-art");
    if (!art) return;
    const chip = document.createElement("span");
    chip.className = `movement-chip ${delta > 0 ? "up" : "down"}`;
    const amount = Math.abs(delta);
    chip.textContent = `${delta > 0 ? "↑" : "↓"} ${amount} ${amount === 1 ? "posição" : "posições"}`;
    art.append(chip);
  });
}

function scheduleEnhance() {
  if (enhanceQueued) return;
  enhanceQueued = true;
  requestAnimationFrame(() => {
    enhanceQueued = false;
    injectHumanInference();
    injectWhyExplanation();
    decorateMovement();
  });
}

function showToast(message) {
  let toast = document.querySelector(".demo-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "demo-toast";
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

hardenStorage();

if (appRoot) {
  new MutationObserver(scheduleEnhance).observe(appRoot, { childList: true, subtree: true });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  if (target.dataset.action === "details") {
    activeDetailsId = target.dataset.id || null;
  }

  if (target.dataset.action === "interact") {
    movementSnapshot = captureRanking();
    setTimeout(() => {
      const state = safeReadState();
      if (!state?.seeded || !movementSnapshot) return;
      try {
        const after = rankContent(state).map(({ item }) => item.id);
        movementState = {
          map: calculateMovement(movementSnapshot, after),
          expiresAt: Date.now() + 2600
        };
        scheduleEnhance();
        setTimeout(() => {
          movementState = null;
          document.querySelectorAll(".movement-chip").forEach((chip) => chip.remove());
        }, 2700);
      } catch (error) {
        console.warn("Recommendation Lab: não foi possível calcular a mudança de ranking.", error);
      }
    }, 0);
  }
}, true);

window.addEventListener("error", (event) => {
  console.error("Recommendation Lab: erro de execução", event.error || event.message);
  showToast("A demo encontrou uma falha pontual. Recarregue a página se algo não responder.");
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Recommendation Lab: promessa rejeitada", event.reason);
  showToast("A demo encontrou uma falha pontual. Recarregue a página se algo não responder.");
});

scheduleEnhance();
