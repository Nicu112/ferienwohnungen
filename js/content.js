// Beschreibungstexte kommen aus beschreibungen/{ordner}/{sprache}.txt (siehe
// CONFIG.haeuser[haus].ordner) — direkt in diesen Dateien bearbeitbar, ohne
// Code anzufassen. Bilder: URLs in CONFIG.haeuser[haus].bilder (siehe
// config.js), ersetzt automatisch die Platzhalter-Kacheln unten.

const KARUSSELL_ANZAHL_PLATZHALTER = 5;

const BESCHREIBUNG_FALLBACK = {
  de: "Beschreibung folgt.",
  fr: "Description à venir."
};

async function renderBeschreibung(hausKey, container) {
  const ordner = CONFIG.haeuser[hausKey].ordner;
  let text = BESCHREIBUNG_FALLBACK[AKTUELLE_SPRACHE] || BESCHREIBUNG_FALLBACK.de;
  try {
    const antwort = await fetch(`beschreibungen/${ordner}/${AKTUELLE_SPRACHE}.txt`);
    if (antwort.ok) text = (await antwort.text()).trim();
  } catch (err) {
    console.error("Beschreibung konnte nicht geladen werden:", err);
  }
  container.innerHTML = `
    <h2 data-i18n="info.title"></h2>
    <p>${escapeHtml(text)}</p>
  `;
  wendeUebersetzungAn();
}

function renderStandort(hausKey, container) {
  const ort = CONFIG.haeuser[hausKey].standort;
  if (!ort) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <svg class="standort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </svg>
    <span>${escapeHtml(ort)}</span>
  `;
}
