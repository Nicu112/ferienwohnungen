// Nur für den lokalen Testbetrieb (CONFIG.useMockData = true).
// Ersetzt die echten Google-Calendar-Events aus Phase 1.
// Daten relativ zu "heute" gesetzt, damit beim Testen sofort etwas sichtbar ist.

// Bewusst ohne toISOString() (siehe calendar.js) — sonst verschiebt sich
// "heute" je nach Zeitzone/Uhrzeit um einen Tag.
function heuteVerschieben(tage) {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const t = String(d.getDate()).padStart(2, "0");
  return `${j}-${m}-${t}`;
}

const MOCK_EVENTS = {
  haus1: [
    { von: heuteVerschieben(3), bis: heuteVerschieben(6), status: "BELEGT" },
    { von: heuteVerschieben(10), bis: heuteVerschieben(12), status: "ANGEFRAGT" }
  ],
  haus2: [
    { von: heuteVerschieben(-2), bis: heuteVerschieben(1), status: "BELEGT" },
    { von: heuteVerschieben(15), bis: heuteVerschieben(17), status: "BELEGT" }
  ]
};

// Anfragen, die während des Testens über das Formular abgeschickt werden,
// landen hier (nur im Speicher, weg nach Neuladen der Seite).
const TEST_REQUESTS = {
  haus1: [],
  haus2: []
};
