// Bildkarussell pro Haus. Ohne echte Fotos (CONFIG.haeuser[haus].bilder leer)
// zeigt es fünf gestaltete Platzhalter-Kacheln statt <img>-Tags.

const KARUSSELL_STATE = {};

const PLATZHALTER_FARBEN = [
  ["#fdf1e3", "#f3cf9c"],
  ["#e8f4f1", "#a9d9cb"],
  ["#f2ecf8", "#cbaee3"],
  ["#fdecec", "#f0aeae"],
  ["#e9f1fd", "#a9c9f0"]
];

function initKarussellState(hausKey) {
  KARUSSELL_STATE[hausKey] = { index: 0 };
}

function karussellBilder(hausKey) {
  const echte = CONFIG.haeuser[hausKey].bilder;
  if (echte && echte.length > 0) return echte.map((src) => ({ echt: true, src }));
  return Array.from({ length: KARUSSELL_ANZAHL_PLATZHALTER }, (_, i) => ({ echt: false, index: i }));
}

function platzhalterSvg(index) {
  const [von, bis] = PLATZHALTER_FARBEN[index % PLATZHALTER_FARBEN.length];
  return `
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="karussellFarbverlauf${index}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${von}"/>
          <stop offset="100%" stop-color="${bis}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#karussellFarbverlauf${index})"/>
      <rect x="150" y="95" width="100" height="70" rx="10" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>
      <circle cx="200" cy="130" r="20" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>
    </svg>
  `;
}

function renderKarussell(hausKey, container) {
  if (!KARUSSELL_STATE[hausKey]) initKarussellState(hausKey);
  const state = KARUSSELL_STATE[hausKey];
  const bilder = karussellBilder(hausKey);

  const slides = bilder
    .map((bild, i) => {
      const inhalt = bild.echt
        ? `<img src="${bild.src}" alt="" loading="lazy">`
        : `<div class="karussell-platzhalter">${platzhalterSvg(i)}<span>${t("carousel.placeholder")} ${i + 1}/${bilder.length}</span></div>`;
      return `<div class="karussell-slide">${inhalt}</div>`;
    })
    .join("");

  const dots = bilder
    .map(
      (_, i) =>
        `<button type="button" class="karussell-dot${i === state.index ? " karussell-dot--aktiv" : ""}" data-dot="${i}" aria-label="${i + 1}/${bilder.length}"></button>`
    )
    .join("");

  container.innerHTML = `
    <div class="karussell-viewport">
      <div class="karussell-track" style="transform: translateX(-${state.index * 100}%)">
        ${slides}
      </div>
      <button type="button" class="karussell-nav karussell-nav--zurueck" data-nav="zurueck" data-i18n-aria="carousel.prev">‹</button>
      <button type="button" class="karussell-nav karussell-nav--vor" data-nav="vor" data-i18n-aria="carousel.next">›</button>
    </div>
    <div class="karussell-dots">${dots}</div>
  `;

  container.querySelector('[data-nav="zurueck"]').addEventListener("click", () => karussellSchritt(hausKey, container, -1));
  container.querySelector('[data-nav="vor"]').addEventListener("click", () => karussellSchritt(hausKey, container, 1));
  container.querySelectorAll("[data-dot]").forEach((dot) => {
    dot.addEventListener("click", () => karussellGeheZu(hausKey, container, Number(dot.dataset.dot)));
  });

  wendeUebersetzungAn();

  let startX = null;
  const viewport = container.querySelector(".karussell-viewport");
  viewport.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );
  viewport.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 40) karussellSchritt(hausKey, container, deltaX < 0 ? 1 : -1);
    startX = null;
  });
}

function karussellSchritt(hausKey, container, delta) {
  const anzahl = karussellBilder(hausKey).length;
  const state = KARUSSELL_STATE[hausKey];
  state.index = (state.index + delta + anzahl) % anzahl;
  renderKarussell(hausKey, container);
}

function karussellGeheZu(hausKey, container, index) {
  KARUSSELL_STATE[hausKey].index = index;
  renderKarussell(hausKey, container);
}
