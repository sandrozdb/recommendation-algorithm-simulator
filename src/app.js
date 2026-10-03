import { CONTENT, INTERACTION_LABELS } from "./data.js";
import {
  addInteraction,
  createInitialState,
  formatScore,
  getDiverseRecommendations,
  getPrimaryPositiveTitle,
  getTopGenres,
  inferProfile,
  rankContent,
  scoreContent,
  seedState,
  setDiversity
} from "./recommender.js";

const STORAGE_KEY = "recommendation-lab-state-v1";
let state = loadState();
let currentView = state.seeded ? "home" : "onboarding";
let selectedSeeds = new Set();
let activeDetailsId = null;

const app = document.querySelector("#app");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    return {
      ...createInitialState(),
      ...parsed
    };
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  selectedSeeds = new Set();
  currentView = "onboarding";
  activeDetailsId = null;
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function poster(item, options = {}) {
  const score = options.score;
  const selected = selectedSeeds.has(item.id);
  return `
    <article class="poster-card ${selected ? "selected" : ""}" data-id="${item.id}">
      <button class="poster-main" data-action="${currentView === "onboarding" ? "select-seed" : "details"}" data-id="${item.id}" aria-label="${escapeHtml(item.title)}">
        <div class="poster-art" style="background:${item.gradient}">
          <div class="poster-glyph">${escapeHtml(item.glyph)}</div>
          ${score != null ? `<span class="score-chip">${formatScore(score)} pts</span>` : ""}
          ${selected ? `<span class="selected-chip">Selecionado</span>` : ""}
        </div>
        <div class="poster-copy">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.format)} • ${item.year}</span>
          <small>${escapeHtml(item.genres.slice(0, 2).join(" • "))}</small>
        </div>
      </button>
    </article>
  `;
}

function header() {
  if (currentView === "onboarding") return "";
  return `
    <header class="topbar">
      <button class="brand" data-action="nav" data-view="home" aria-label="Ir para o início">
        <span class="brand-mark">R</span>
        <span>
          <b>Recommendation Lab</b>
          <small>simulação didática</small>
        </span>
      </button>
      <nav class="nav-tabs" aria-label="Navegação principal">
        <button class="${currentView === "home" ? "active" : ""}" data-action="nav" data-view="home">Início</button>
        <button class="${currentView === "xray" ? "active" : ""}" data-action="nav" data-view="xray">Raio-X</button>
        <button class="${currentView === "about" ? "active" : ""}" data-action="nav" data-view="about">Sobre</button>
      </nav>
      <button class="ghost danger" data-action="reset">Resetar demo</button>
    </header>
  `;
}

function renderOnboarding() {
  const ids = [
    "lizzie-mcguire",
    "lizzie-mcguire-movie",
    "a-cinderella-story",
    "younger",
    "how-i-met-your-father",
    "cheaper-by-the-dozen",
    "senna",
    "black-mirror",
    "bridgerton",
    "money-heist",
    "our-planet",
    "squid-game"
  ];
  const items = ids.map((id) => CONTENT.find((item) => item.id === id));
  return `
    <main class="onboarding-shell">
      <section class="onboarding-intro">
        <div class="eyebrow">EXPERIMENTO • SISTEMAS DE RECOMENDAÇÃO</div>
        <h1>O sistema ainda não sabe o que você gosta.</h1>
        <p>Escolha <strong>3 títulos</strong>. Essa seleção inicial será usada apenas para começar o perfil de recomendações — depois, suas interações passam a falar mais alto.</p>
        <div class="source-note">Inspirado no “arranque” de recomendações descrito publicamente pela Netflix. Pesos e scores desta demo são ilustrativos.</div>
      </section>
      <section class="seed-panel">
        <div class="seed-head">
          <div>
            <span>Escolhas iniciais</span>
            <strong>${selectedSeeds.size}/3 selecionados</strong>
          </div>
          <button class="primary" data-action="start" ${selectedSeeds.size === 3 ? "" : "disabled"}>Criar meu feed</button>
        </div>
        <div class="poster-grid seed-grid">
          ${items.map((item) => poster(item)).join("")}
        </div>
      </section>
    </main>
  `;
}

function genreBars() {
  const genres = getTopGenres(state, 5);
  if (!genres.length) return `<p class="muted">Interaja com os títulos para o perfil começar a aparecer.</p>`;
  const max = Math.max(...genres.map((genre) => genre.value), 1);
  return genres.map((genre) => {
    const width = Math.max(5, Math.round((genre.value / max) * 100));
    return `
      <div class="profile-row">
        <span>${escapeHtml(genre.name)}</span>
        <div class="profile-track"><i style="width:${width}%"></i></div>
        <b>${Math.round(genre.value * 10) / 10}</b>
      </div>
    `;
  }).join("");
}

function renderHome() {
  const ranked = rankContent(state);
  const heroEntry = ranked[0];
  const top = ranked.slice(0, 6);
  const primary = getPrimaryPositiveTitle(state);
  const related = primary
    ? ranked.filter(({ item }) => item.id !== primary.id && item.genres.some((genre) => primary.genres.includes(genre))).slice(0, 6)
    : ranked.slice(6, 12);
  const diverse = getDiverseRecommendations(state, 6);
  const interactionCount = state.interactions.filter((interaction) => interaction.type !== "seed").length;

  return `
    <main>
      <section class="hero" style="--hero:${heroEntry.item.gradient}">
        <div class="hero-overlay"></div>
        <div class="hero-copy">
          <div class="eyebrow">SEU RANKING MUDOU COM ${interactionCount} INTERA${interactionCount === 1 ? "ÇÃO" : "ÇÕES"}</div>
          <h1>${escapeHtml(heroEntry.item.title)}</h1>
          <p>Hoje este título aparece em primeiro porque combina sinais do seu perfil inferido, popularidade, recência e uma pequena dose de exploração.</p>
          <div class="hero-actions">
            <button class="primary" data-action="details" data-id="${heroEntry.item.id}">Ver recomendação</button>
            <button class="ghost" data-action="nav" data-view="xray">Abrir Raio-X</button>
          </div>
          <small class="score-caption">Score didático: ${formatScore(heroEntry.score.total)} pontos • não é probabilidade real</small>
        </div>
        <aside class="hero-profile glass-card">
          <span>Perfil inferido agora</span>
          ${genreBars()}
        </aside>
      </section>

      <section class="content-section">
        <div class="section-head">
          <div>
            <span class="eyebrow">RANKING PERSONALIZADO</span>
            <h2>Top picks para você</h2>
          </div>
          <button class="text-link" data-action="nav" data-view="xray">ver como foi calculado →</button>
        </div>
        <div class="poster-row">${top.map(({ item, score }) => poster(item, { score: score.total })).join("")}</div>
      </section>

      <section class="content-section">
        <div class="section-head">
          <div>
            <span class="eyebrow">SIMILARIDADE</span>
            <h2>${primary ? `Porque você interagiu com ${escapeHtml(primary.title)}` : "Conteúdos parecidos"}</h2>
          </div>
        </div>
        <div class="poster-row">${related.map(({ item, score }) => poster(item, { score: score.total })).join("")}</div>
      </section>

      <section class="content-section bottom-section">
        <div class="section-head">
          <div>
            <span class="eyebrow">EXPLORAÇÃO</span>
            <h2>Talvez você também goste</h2>
          </div>
          <span class="section-note">Inclui variedade para não repetir apenas o que o