const appRoot = document.querySelector("#app");
let queued = false;

function polishAboutPage() {
  const aboutPage = document.querySelector(".about-page");
  if (!aboutPage) return;

  const pageTitle = aboutPage.querySelector(".page-title h1");
  const pageIntro = aboutPage.querySelector(".page-title p");
  if (pageTitle) pageTitle.textContent = "Como esta simulação funciona";
  if (pageIntro) {
    pageIntro.textContent = "Entenda o que esta demo representa, o que foi simplificado para fins didáticos e como os dados da experiência são tratados.";
  }

  const cards = [...aboutPage.querySelectorAll(".about-grid .dashboard-card")];
  if (cards[0]) {
    const h2 = cards[0].querySelector("h2");
    if (h2) h2.textContent = "O que é real?";
  }

  if (cards[1]) {
    const h2 = cards[1].querySelector("h2");
    if (h2) h2.textContent = "O que é simulado?";
  }

  if (cards[2]) {
    const h2 = cards[2].querySelector("h2");
    if (h2) h2.textContent = "Como seus dados são tratados?";
  }

  if (cards[3]) {
    const h2 = cards[3].querySelector("h2");
    if (h2) h2.textContent = "Por que construir esta simulação?";
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    polishAboutPage();
  });
}

if (appRoot) {
  new MutationObserver(schedule).observe(appRoot, { childList: true, subtree: true });
}

schedule();
