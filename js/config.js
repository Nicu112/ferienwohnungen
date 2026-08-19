// Alle Konten-/Kalender-Angaben an einem Ort. Pro Haus entscheidet allein das
// Vorhandensein von googleCalendarId (+ ein gesetzter googleCalendarApiKey),
// ob calendar.js echte Google-Calendar-Daten lädt oder auf MOCK_EVENTS
// zurückfällt — kein globaler Schalter mehr nötig, jedes Haus kann einzeln
// umgestellt werden, sobald sein Kalender eingerichtet ist.
const CONFIG = {
  googleCalendarApiKey: "", // TODO: Im Produktions-Deploy setzen oder über Env-Var laden

  haeuser: {
    haus1: {
      name: "Les Marmottes",
      standort: "Arolla",
      googleCalendarId: "4272fb587c47328f819830065cf06566108ca68f64dcf0a6a89f6fd6f399b933@group.calendar.google.com",
      appsScriptUrl: "", // TODO Phase 3: Web-App-URL des Apps Script
      verwalterEmail: "lesmarmottesb@gmail.com",
      bilder: [], // TODO: echte Bild-URLs eintragen, z. B. ["img/haus1-1.jpg", ...] — leer lassen für Platzhalter
      preise: { erwachsene: 0, kind: 0, reinigung: 0 } // TODO: echte Preise in CHF eintragen (0 = "noch nicht festgelegt")
    },
    haus2: {
      name: "Les Deux Cypres",
      standort: "Frankreich",
      googleCalendarId: "",
      appsScriptUrl: "",
      verwalterEmail: "lesdeuxcypres5@gmail.com",
      bilder: [],
      preise: { erwachsene: 0, kind: 0, reinigung: 0 }
    }
  }
};
