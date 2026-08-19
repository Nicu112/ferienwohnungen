// Platzhalter-Inhalte für Karussell und Beschreibungstext pro Haus.
// Echte Fotos: URLs in CONFIG.haeuser[haus].bilder eintragen (siehe config.js),
// ersetzt automatisch die Platzhalter-Kacheln unten. Bis dahin erscheinen
// gestaltete SVG-Kacheln als Platzhalter, keine externen Bild-Requests.

const HAUS_BESCHREIBUNG = {
  haus1: {
    de: "Beschreibung folgt. Hier steht später ein Text über Lage, Ausstattung und Besonderheiten von Les Marmottes.",
    fr: "Description à venir. Un texte sur l'emplacement, l'équipement et les particularités de Les Marmottes suivra ici.",
    en: "Description coming soon. A text about the location, amenities and highlights of Les Marmottes will go here."
  },
  haus2: {
    de: "Beschreibung folgt. Hier steht später ein Text über Lage, Ausstattung und Besonderheiten von Les Deux Cypres.",
    fr: "Description à venir. Un texte sur l'emplacement, l'équipement et les particularités de Les Deux Cypres suivra ici.",
    en: "Description coming soon. A text about the location, amenities and highlights of Les Deux Cypres will go here."
  }
};

const KARUSSELL_ANZAHL_PLATZHALTER = 5;

function renderBeschreibung(hausKey, container) {
  const text = HAUS_BESCHREIBUNG[hausKey][AKTUELLE_SPRACHE] || HAUS_BESCHREIBUNG[hausKey].de;
  container.innerHTML = `
    <h2 data-i18n="info.title"></h2>
    <p>${escapeHtml(text)}</p>
  `;
  wendeUebersetzungAn();
}

function formatierePreis(betrag) {
  return betrag > 0 ? `CHF ${betrag}.–` : "–";
}

function renderPreise(hausKey, container) {
  const preise = CONFIG.haeuser[hausKey].preise;
  container.innerHTML = `
    <h2 data-i18n="preise.title"></h2>
    <ul class="preise-liste">
      <li><span data-i18n="preise.erwachsene"></span><strong>${formatierePreis(preise.erwachsene)}</strong></li>
      <li><span data-i18n="preise.kind"></span><strong>${formatierePreis(preise.kind)}</strong></li>
      <li><span data-i18n="preise.reinigung"></span><strong>${formatierePreis(preise.reinigung)}</strong></li>
    </ul>
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
