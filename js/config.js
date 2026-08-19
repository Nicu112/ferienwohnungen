// Alle Konten-/Kalender-Angaben an einem Ort. Sobald diese Werte echt sind,
// useMockData auf false stellen — der Rest des Codes ändert sich nicht.
const CONFIG = {
  useMockData: true,

  googleCalendarApiKey: "", // TODO Phase 0: Calendar-API-Key aus Google Cloud Console

  haeuser: {
    haus1: {
      name: "Les Marmottes",
      standort: "Arolla",
      googleCalendarId: "", // TODO: ID des öffentlichen Kalenders "Verfügbarkeit"
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
