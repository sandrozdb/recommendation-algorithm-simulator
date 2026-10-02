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
    "senna",
    "drive-to-survive",
    "beckham",
    "stranger-things",
    "black-mirror",
    "bridgerton",
    "money-heist",
    "our-planet",
    "wednesday",
    "chefs-table",
    "squid-game",
    "dark"
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
          <span class="section-note">Inclui variedade para não repetir apenas o que o sistema já conhece.</span>
        </div>
        <div class="poster-row">${diverse.map(({ item, score }) => poster(item, { score: score.total })).join("")}</div>
      </section>
    </main>
  `;
}

function renderXray() {
  const ranked = rankContent(state).slice(0, 8);
  const genres = getTopGenres(state, 8);
  const maxGenre = Math.max(1, ...genres.map((genre) => genre.value));
  const interactions = [...state.interactions].reverse().slice(0, 10);

  return `
    <main class="page-shell">
      <section class="page-title">
        <div>
          <span class="eyebrow">RAIO-X DO ALGORITMO</span>
          <h1>O que o simulador acha que você gosta?</h1>
          <p>Veja o perfil inferido e como cada componente contribui para o ranking. Os pesos são <strong>didáticos</strong>, não representam a fórmula real da Netflix.</p>
        </div>
        <div class="objective-card glass-card">
          <label for="diversity">Diversidade no ranking <b>${state.diversity}%</b></label>
          <input id="diversity" data-action="diversity" type="range" min="0" max="100" value="${state.diversity}">
          <small>0% prioriza afinidade. 100% aumenta a exploração de temas fora do seu padrão.</small>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="dashboard-card span-5">
          <div class="card-head"><span>Perfil inferido</span><small>baseado nas suas interações</small></div>
          <div class="big-profile">
            ${genres.length ? genres.map((genre) => `
              <div class="big-profile-row">
                <span>${escapeHtml(genre.name)}</span>
                <div><i style="width:${Math.max(4, Math.round((genre.value / maxGenre) * 100))}%"></i></div>
                <b>${Math.round(genre.value * 10) / 10}</b>
              </div>
            `).join("") : `<p class="muted">Nenhum perfil inferido ainda.</p>`}
          </div>
        </article>

        <article class="dashboard-card span-7">
          <div class="card-head"><span>Ranking atual</span><small>score ilustrativo de 0 a 100</small></div>
          <div class="ranking-table">
            <div class="ranking-head"><span>#</span><span>Título</span><span>Similar.</span><span>Popular.</span><span>Recência</span><span>Explor.</span><span>Total</span></div>
            ${ranked.map(({ item, score }, index) => `
              <button class="ranking-row" data-action="details" data-id="${item.id}">
                <b>${index + 1}</b>
                <span>${escapeHtml(item.title)}</span>
                <span>${formatScore(score.similarity)}</span>
                <span>${formatScore(score.popularity)}</span>
                <span>${formatScore(score.recency)}</span>
                <span>${formatScore(score.exploration)}</span>
                <strong>${formatScore(score.total)}</strong>
              </button>
            `).join("")}
          </div>
        </article>

        <article class="dashboard-card span-7">
          <div class="card-head"><span>Últimos sinais</span><small>o comportamento alimenta a próxima recomendação</small></div>
          <div class="timeline">
            ${interactions.map((interaction) => {
              const item = CONTENT.find((entry) => entry.id === interaction.contentId);
              return `
                <div class="timeline-item">
                  <i></i>
                  <div><strong>${escapeHtml(INTERACTION_LABELS[interaction.type] || interaction.type)}</strong><span>${escapeHtml(item?.title || interaction.contentId)}</span></div>
                </div>
              `;
            }).join("")}
          </div>
        </article>

        <article class="dashboard-card span-5 formula-card">
          <div class="card-head"><span>Modelo didático</span><small>como esta simulação funciona</small></div>
          <div class="formula">
            <div><b>1</b><span>Similaridade</span><small>afinidade com gêneros e tags</small></div>
            <div><b>2</b><span>Popularidade</span><small>sinal global do título</small></div>
            <div><b>3</b><span>Recência</span><small>preferências positivas recentes</small></div>
            <div><b>4</b><span>Exploração</span><small>variedade fora do top de interesses</small></div>
          </div>
          <p class="formula-summary">Mudar os sinais ou o objetivo muda o ranking.</p>
        </article>
      </section>
    </main>
  `;
}

function renderAbout() {
  return `
    <main class="page-shell about-page">
      <section class="page-title">
        <div>
          <span class="eyebrow">SOBRE A DEMO</span>
          <h1>Uma simulação para tornar recomendação visível.</h1>
          <p>O Recommendation Lab foi criado para demonstrar, de forma transparente, como sinais comportamentais podem alterar um ranking de conteúdo.</p>
        </div>
      </section>

      <section class="about-grid">
        <article class="dashboard-card">
          <h2>O que é real</h2>
          <p>A Netflix descreve publicamente que suas recomendações consideram interações com o serviço, assinantes com gostos similares, informações dos títulos, horário, idioma, dispositivo e duração assistida.</p>
          <p>Também informa que títulos recentes tendem a influenciar mais as recomendações e que a página inicial personaliza fileiras, títulos e ordem.</p>
          <a href="https://help.netflix.com/pt/node/100639" target="_blank" rel="noreferrer">Fonte oficial: Central de Ajuda Netflix ↗</a>
        </article>
        <article class="dashboard-card">
          <h2>O que é simulado</h2>
          <p>Os pesos, scores, fórmulas e combinações utilizados aqui foram criados exclusivamente para fins didáticos. Eles não representam código, pesos ou regras internas da Netflix.</p>
          <p>O objetivo é visualizar princípios de sistemas de recomendação: sinais → candidatos → relevância → ranking → exibição → novos sinais.</p>
        </article>
        <article class="dashboard-card">
          <h2>Privacidade</h2>
          <p>Esta aplicação não possui login, banco de dados ou backend. Todas as interações ficam apenas no <code>localStorage</code> do navegador e podem ser apagadas pelo botão “Resetar demo”.</p>
          <p>Isso também torna a demonstração simples de executar em ambientes corporativos.</p>
        </article>
        <article class="dashboard-card">
          <h2>Por que construir isso?</h2>
          <p>Porque uma apresentação sobre algoritmos fica muito mais clara quando o público consegue ver o ranking mudando ao vivo e abrir o “porquê” de cada recomendação.</p>
          <p>Projeto desenvolvido por <strong>Sandro Ferreira</strong> como apoio visual para uma apresentação executiva sobre algoritmos, comportamento e personalização.</p>
        </article>
      </section>
    </main>
  `;
}

function detailsModal(item) {
  const score = scoreContent(item, state);
  const topGenres = getTopGenres(state, 3).map((genre) => genre.name);
  const overlap = item.genres.filter((genre) => topGenres.includes(genre));
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-stop-close>
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
        <div class="modal-hero" style="background:${item.gradient}">
          <div class="poster-glyph large">${escapeHtml(item.glyph)}</div>
          <div>
            <span class="eyebrow">${escapeHtml(item.format)} • ${item.year}</span>
            <h2 id="modal-title">${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.genres.join(" • "))}</p>
          </div>
        </div>

        <div class="modal-body">
          <div class="why-block">
            <div class="why-title">
              <div><span class="eyebrow">POR QUE ESTOU VENDO ISSO?</span><h3>Score didático: ${formatScore(score.total)} pontos</h3></div>
              <small>${overlap.length ? `Combina com ${escapeHtml(overlap.join(", "))}` : "Inclui exploração fora do seu padrão atual"}</small>
            </div>
            ${contributionBar("Similaridade", score.similarity, 58)}
            ${contributionBar("Popularidade", score.popularity, 20)}
            ${contributionBar("Recência", score.recency, 12)}
            ${contributionBar("Exploração", score.exploration, 25)}
            ${score.penalty > 0 ? contributionBar("Penalidade por sinal negativo", -score.penalty, 35, true) : ""}
          </div>

          <div class="interaction-block">
            <h3>Gere um novo sinal</h3>
            <p>Faça uma escolha e veja o ranking se reorganizar.</p>
            <div class="interaction-actions">
              <button data-action="interact" data-type="preview" data-id="${item.id}">▶ 10 min</button>
              <button data-action="interact" data-type="finish" data-id="${item.id}">✓ Até o fim</button>
              <button data-action="interact" data-type="like" data-id="${item.id}">👍 Gostei</button>
              <button data-action="interact" data-type="love" data-id="${item.id}">♥ Amei</button>
              <button data-action="interact" data-type="dislike" data-id="${item.id}">👎 Não é para mim</button>
              <button data-action="interact" data-type="abandon" data-id="${item.id}">↩ Abandonei</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function contributionBar(label, value, max, negative = false) {
  const width = clampPercent(Math.abs(value) / max * 100);
  return `
    <div class="contribution-row ${negative ? "negative" : ""}">
      <span>${escapeHtml(label)}</span>
      <div><i style="width:${width}%"></i></div>
      <b>${value >= 0 ? "+" : ""}${formatScore(value)}</b>
    </div>
  `;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function render() {
  let content = "";
  if (currentView === "onboarding") content = renderOnboarding();
  if (currentView === "home") content = renderHome();
  if (currentView === "xray") content = renderXray();
  if (currentView === "about") content = renderAbout();

  app.innerHTML = `
    ${header()}
    ${content}
    ${activeDetailsId ? detailsModal(CONTENT.find((item) => item.id === activeDetailsId)) : ""}
  `;
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "select-seed") {
    const id = button.dataset.id;
    if (selectedSeeds.has(id)) selectedSeeds.delete(id);
    else if (selectedSeeds.size < 3) selectedSeeds.add(id);
    render();
    return;
  }

  if (action === "start") {
    if (selectedSeeds.size !== 3) return;
    state = seedState([...selectedSeeds]);
    saveState();
    currentView = "home";
    render();
    return;
  }

  if (action === "nav") {
    currentView = button.dataset.view;
    activeDetailsId = null;
    render();
    return;
  }

  if (action === "reset") {
    if (confirm("Resetar todas as interações e voltar ao início da demo?")) resetDemo();
    return;
  }

  if (action === "details") {
    activeDetailsId = button.dataset.id;
    render();
    return;
  }

  if (action === "close-modal") {
    activeDetailsId = null;
    render();
    return;
  }

  if (action === "interact") {
    const id = button.dataset.id;
    const type = button.dataset.type;
    state = addInteraction(state, id, type);
    saveState();
    activeDetailsId = null;
    currentView = "home";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

app.addEventListener("input", (event) => {
  if (event.target.dataset.action !== "diversity") return;
  state = setDiversity(state, event.target.value);
  saveState();
  render();
});

render();
