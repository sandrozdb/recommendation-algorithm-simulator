const appRoot = document.querySelector("#app");
let queued = false;

const COMPONENT_MAX = {
  Similaridade: 55,
  Popularidade: 20,
  "Recência": 10,
  "Exploração": 15
};

function expandRankingLabels() {
  const head = document.querySelector(".ranking-head");
  if (!head) return;

  const labels = head.querySelectorAll("span");
  const replacements = ["#", "Título", "Similaridade", "Popularidade", "Recência", "Exploração", "Total"];
  labels.forEach((label, index) => {
    if (replacements[index]) label.textContent = replacements[index];
  });

  const columns = "34px minmax(190px,2fr) repeat(5,minmax(92px,1fr))";
  head.style.gridTemplateColumns = columns;
  document.querySelectorAll(".ranking-row").forEach((row) => {
    row.style.gridTemplateColumns = columns;
  });

  const table = head.closest(".ranking-table");
  if (table) table.style.minWidth = "820px";
}

function clarifyModalBreakdown() {
  const whyBlock = document.querySelector(".why-block");
  if (!whyBlock) return;

  whyBlock.querySelectorAll(".contribution-row").forEach((row) => {
    const label = row.querySelector("span")?.textContent?.trim();
    if (!label) return;

    if (label.startsWith("Penalidade")) {
      row.remove();
      return;
    }

    const max = COMPONENT_MAX[label];
    if (!max) return;

    const valueNode = row.querySelector("b");
    const fill = row.querySelector("i");
    if (!valueNode || !fill) return;

    const value = Number.parseFloat(valueNode.textContent.replace("+", ""));
    if (!Number.isFinite(value)) return;
    const width = Math.max(0, Math.min(100, (Math.abs(value) / max) * 100));
    fill.style.width = `${Math.round(width)}%`;
  });

  const title = whyBlock.querySelector(".why-title h3");
  if (title && !title.dataset.sumExplained) {
    const score = Number.parseInt(title.textContent.match(/\d+/)?.[0] || "", 10);
    if (Number.isFinite(score)) {
      title.textContent = `Total: ${score} pontos`;
      const note = document.createElement("small");
      note.className = "score-sum-note";
      note.textContent = "Total = Similaridade + Popularidade + Recência + Exploração";
      note.style.display = "block";
      note.style.marginTop = "5px";
      note.style.color = "#9fa2aa";
      title.insertAdjacentElement("afterend", note);
    }
    title.dataset.sumExplained = "true";
  }
}

function clarifyRankingCard() {
  const card = document.querySelector(".ranking-table")?.closest(".dashboard-card");
  const small = card?.querySelector(".card-head small");
  if (small) small.textContent = "Total = soma dos quatro componentes • escala didática 0–100";
}

function applyClarity() {
  expandRankingLabels();
  clarifyRankingCard();
  clarifyModalBreakdown();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyClarity();
  });
}

if (appRoot) {
  new MutationObserver(schedule).observe(appRoot, { childList: true, subtree: true });
}

schedule();
