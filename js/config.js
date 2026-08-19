// Alle Konten-/Kalender-Angaben an einem Ort. Pro Haus entscheidet allein das
// Vorhandensein von googleCalendarId (+ ein gesetzter googleCalendarApiKey),
// ob calendar.js echte Google-Calendar-Daten lädt oder auf MOCK_EVENTS
// zurückfällt — kein globaler Schalter mehr nötig, jedes Haus kann einzeln
// umgestellt werden, sobald sein Kalender eingerichtet ist.
const CONFIG = {
  googleCalendarApiKey: "AIzaSyBBi-leBWKdw4bKlZ38CwbdGKX8k3tcgY0", // Lokal für Tests; auf GitHub leer

  haeuser: {
    haus1: {
      name: "Les Marmottes",
      standort: "Arolla, CH",
      ordner: "les-marmottes", // Unterordner in bilder/ und beschreibungen/
      googleCalendarId: "4272fb587c47328f819830065cf06566108ca68f64dcf0a6a89f6fd6f399b933@group.calendar.google.com",
      appsScriptUrl: "https://script.google.com/macros/s/AKfycbxD42xD-LKPbK8XFGmw3YlhC-B4wMuF2lxz20sUjyhP4m2-n7lpcEzac_drsMuPrSKOqQ/exec",
      verwalterEmail: "lesmarmottesb@gmail.com",
      bilder: ["bilder/les-marmottes/1.jpg", "bilder/les-marmottes/2.jpg", "bilder/les-marmottes/3.jpg", "bilder/les-marmottes/4.jpg", "bilder/les-marmottes/5.jpg"]
    },
    haus2: {
      name: "Les Deux Cypres",
      aktiv: false, // Tab auf der Website ausgeblendet, bis dieses Haus gebraucht wird — einfach auf true stellen, um es wieder zu zeigen
      standort: "Uzès, FR",
      ordner: "les-deux-cypres",
      googleCalendarId: "",
      appsScriptUrl: "",
      verwalterEmail: "lesdeuxcypres5@gmail.com",
      bilder: ["bilder/les-deux-cypres/1.jpg", "bilder/les-deux-cypres/2.jpg", "bilder/les-deux-cypres/3.jpg", "bilder/les-deux-cypres/4.jpg", "bilder/les-deux-cypres/5.jpg"]
    }
  }
};
