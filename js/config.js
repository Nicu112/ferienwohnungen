// Alle Konten-/Kalender-Angaben an einem Ort. Pro Haus entscheidet allein das
// Vorhandensein von googleCalendarId (+ ein gesetzter googleCalendarApiKey),
// ob calendar.js echte Google-Calendar-Daten lädt oder auf MOCK_EVENTS
// zurückfällt — kein globaler Schalter mehr nötig, jedes Haus kann einzeln
// umgestellt werden, sobald sein Kalender eingerichtet ist.
const CONFIG = {
  googleCalendarApiKey: "AIzaSyAfDcKGwECtItLC5AlYFb3jnoJpmQM6_YY", // Lokal für Tests; auf GitHub leer
  haeuser: {
    haus1: {
      name: "Les Marmottes",
      standort: "Arolla, CH",
      ordner: "les-marmottes", // Unterordner in bilder/ und beschreibungen/
      googleCalendarId: "4272fb587c47328f819830065cf06566108ca68f64dcf0a6a89f6fd6f399b933@group.calendar.google.com",
      appsScriptUrl: "https://script.google.com/macros/s/AKfycbyT5WaZH2aNdd5BrzImm1iq_FbX7HXxJ26JDIc6eplPeSzN2OALO3_cX4iUM3ct39JsfQ/exec",
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
    },
    haus3: {
      name: "Orion",
      standort: "Leytron, CH",
      ordner: "orion",
      googleCalendarId: "11d1b8e4cccbbed74089b37945fba45f7d5afec1c700ad80fa575bfd86b0d051@group.calendar.google.com",
      appsScriptUrl: "https://script.google.com/macros/s/AKfycby3C8YIJY1hhqLV8bHBUWaaGt3QNKFi1zB2CQdOBktflTy0YHQIi0dMWZBsmuSi2Usgtw/exec",
      verwalterEmail: "ovz.orion@gmail.com",
      bilder: ["bilder/orion/1.jpg", "bilder/orion/2.jpg", "bilder/orion/3.jpg", "bilder/orion/4.jpg", "bilder/orion/5.jpg"]
    }
  }
};
