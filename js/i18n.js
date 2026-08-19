const I18N = {
  de: {
    "calendar.prev": "‹ Vorheriger Monat",
    "calendar.next": "Nächster Monat ›",
    "calendar.free": "frei",
    "calendar.requested": "Reservation angefragt",
    "calendar.booked": "belegt",
    "calendar.error.blocked": "In diesem Zeitraum liegt ein bereits belegter oder angefragter Tag. Bitte neu auswählen.",
    "calendar.error.load": "Kalender konnte nicht geladen werden. Zeigt eventuell nicht alle Belegungen.",
    "calendar.hint.start": "Ankunftstag auswählen",
    "calendar.hint.end": "Abreisetag auswählen",
    "carousel.prev": "Vorheriges Bild",
    "carousel.next": "Nächstes Bild",
    "carousel.placeholder": "Bild",
    "info.title": "Über dieses Haus",
    "form.title": "Buchung anfragen",
    "form.range": "Zeitspanne",
    "form.adults": "Erwachsene",
    "form.children": "Kinder",
    "form.pets": "Tiere",
    "form.petType": "Welche Tiere?",
    "form.petType.placeholder": "z. B. 1 Hund",
    "form.name": "Name",
    "form.email": "E-Mail",
    "form.phone": "Telefon",
    "form.submit": "Buchung anfragen",
    "form.success.title": "Anfrage abgeschickt (Testmodus)",
    "form.success.body": "Im echten Betrieb geht jetzt diese Mail an den Verwalter, und die Tage werden im öffentlichen Kalender als „angefragt“ blockiert:",
    "form.success.title.real": "Anfrage abgeschickt",
    "form.success.body.real": "Deine Anfrage wurde an den Verwalter geschickt. Du erhältst eine Rückmeldung, sobald sie bearbeitet wurde.",
    "lang.de": "DE",
    "lang.fr": "FR"
  },
  fr: {
    "calendar.prev": "‹ Mois précédent",
    "calendar.next": "Mois suivant ›",
    "calendar.free": "libre",
    "calendar.requested": "Réservation demandée",
    "calendar.booked": "occupé",
    "calendar.error.blocked": "Cette période contient un jour déjà occupé ou demandé. Veuillez sélectionner à nouveau.",
    "calendar.hint.start": "Choisir la date d'arrivée",
    "calendar.hint.end": "Choisir la date de départ",
    "carousel.prev": "Image précédente",
    "carousel.next": "Image suivante",
    "carousel.placeholder": "Image",
    "info.title": "À propos de cette maison",
    "form.title": "Demande de réservation",
    "form.range": "Période",
    "form.adults": "Adultes",
    "form.children": "Enfants",
    "form.pets": "Animaux",
    "form.petType": "Quels animaux ?",
    "form.petType.placeholder": "p. ex. 1 chien",
    "form.name": "Nom",
    "form.email": "E-mail",
    "form.phone": "Téléphone",
    "form.submit": "Envoyer la demande",
    "form.success.title": "Demande envoyée (mode test)",
    "form.success.body": "En production, cet e-mail serait envoyé au gestionnaire et les jours seraient bloqués comme « demandés » dans le calendrier public :",
    "form.success.title.real": "Demande envoyée",
    "form.success.body.real": "Votre demande a été envoyée au gestionnaire. Vous recevrez une réponse dès qu'elle sera traitée.",
    "lang.de": "DE",
    "lang.fr": "FR"
  }
};

const SUPPORTED_LANGS = ["de", "fr"];

function ermittleStartsprache() {
  const gespeichert = localStorage.getItem("lang");
  if (gespeichert && SUPPORTED_LANGS.includes(gespeichert)) return gespeichert;
  const geraet = (navigator.language || "de").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(geraet) ? geraet : "de";
}

let AKTUELLE_SPRACHE = ermittleStartsprache();

function t(key) {
  return (I18N[AKTUELLE_SPRACHE] && I18N[AKTUELLE_SPRACHE][key]) || key;
}

// Übersetzt nur den vorhandenen DOM, ohne Event — sicher für den Aufruf aus
// renderFormular() nach jedem Neuaufbau des Formulars (sonst Rekursion, siehe
// wendeSpracheAn unten).
function wendeUebersetzungAn() {
  document.documentElement.lang = AKTUELLE_SPRACHE;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === AKTUELLE_SPRACHE);
  });
}

// Für echte Sprachwechsel: übersetzt UND informiert app.js, damit Kalender/
// Formulare mit sprachabhängigem Inhalt (z. B. Monatsname) neu gezeichnet
// werden. Nicht aus renderFormular() aufrufen.
function wendeSpracheAn() {
  wendeUebersetzungAn();
  document.dispatchEvent(new CustomEvent("sprache-geaendert"));
}

function setzeSprache(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  AKTUELLE_SPRACHE = lang;
  localStorage.setItem("lang", lang);
  wendeSpracheAn();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setzeSprache(btn.getAttribute("data-lang")));
  });
  wendeSpracheAn();
});
