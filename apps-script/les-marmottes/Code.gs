// Apps Script Web App für Les Marmottes. Läuft im Google-Konto
// lesmarmottesb@gmail.com (dort in script.google.com einfügen + als Web App
// deployen). Legt bei Bedarf automatisch an: das Sheet "Les Marmottes –
// Anfragen" und vier Google-Drive-Textdateien mit den Antwort-Vorlagen
// (siehe VORLAGEN_DATEIEN unten) — Wortlaut lässt sich dort direkt ändern,
// ohne den Code anzufassen.
//
// Nur EIN Kalender für alles (KALENDER_ID unten) — die Website liest ihn
// direkt und zeigt automatisch jeden Termin als "belegt" an (Titel = Name),
// unabhängig davon ob er über die Website oder manuell in Google Calendar
// angelegt wurde. Einzige Ausnahme: ein Titel, der auf "(ANGEFRAGT)" endet,
// gilt als offene Anfrage (gelb) — sieh calendar.js/parseEventTitel.
//
// Ablauf:
//   doPost   <- Website sendet neue Anfrage (inkl. Sprache der Seite)
//              -> "Name (ANGEFRAGT)"-Eintrag im Kalender
//              -> Zeile im Sheet (inkl. Sprache)
//              -> Mail an den Verwalter mit "Zusagen"/"Ablehnen"-Links
//   doGet    <- Verwalter klickt einen der beiden Links in der Mail
//     ablehnen  -> öffnet vorbereitete Antwort-Mail an den Gast, in der
//                  Sprache, die der Gast beim Anfragen ausgewählt hatte
//                  (Kalender-Eintrag bleibt vorerst bestehen)
//     zusagen   -> benennt den bestehenden Eintrag auf reinen Namen um
//                  (kein "(ANGEFRAGT)" mehr -> zählt automatisch als
//                  "belegt"), schreibt Kontaktdaten in die Beschreibung
//                  (die Website liest nur den Titel, nie die Beschreibung),
//                  öffnet vorbereitete Bestätigungs-Mail (gleiche Sprachlogik)

const KALENDER_ID =
  "4272fb587c47328f819830065cf06566108ca68f64dcf0a6a89f6fd6f399b933@group.calendar.google.com";
const VERWALTER_EMAIL = "lesmarmottesb@gmail.com";
const HAUS_NAME = "Les Marmottes";
const SHEET_DATEINAME = "Les Marmottes – Anfragen";
const BLATT_NAME = "Anfragen";
const SHEET_SPALTEN = [
  "id", "timestamp", "haus", "name", "email", "telefon", "von", "bis",
  "erwachsene", "kinder", "tiere", "tierart", "status", "eventId", "sprache"
];

// Antwort-Texte als eigene Drive-Textdateien, damit sich der Wortlaut
// ändern lässt, ohne den Code zu berühren. Werden beim ersten Aufruf mit
// diesen Platzhaltertexten automatisch angelegt, danach einfach in Drive
// öffnen und den Inhalt überschreiben. {{name}}, {{von}}, {{bis}}, {{haus}}
// werden beim Versand ersetzt.
const VORLAGEN_DATEIEN = {
  "zusagen-de": {
    name: "Les Marmottes – Antwort Zusagen DE",
    standard: "Vielen Dank, hier noch Infos."
  },
  "zusagen-fr": {
    name: "Les Marmottes – Antwort Zusagen FR",
    standard: "Merci, voici encore quelques infos."
  },
  "ablehnen-de": {
    name: "Les Marmottes – Antwort Ablehnen DE",
    standard: "Leider keine Kapazität."
  },
  "ablehnen-fr": {
    name: "Les Marmottes – Antwort Ablehnen FR",
    standard: "Malheureusement pas de disponibilité."
  }
};

function getKalender() {
  return CalendarApp.getCalendarById(KALENDER_ID);
}

function getSheet() {
  const dateien = DriveApp.getFilesByName(SHEET_DATEINAME);
  let ss;
  if (dateien.hasNext()) {
    ss = SpreadsheetApp.open(dateien.next());
  } else {
    ss = SpreadsheetApp.create(SHEET_DATEINAME);
    const blatt = ss.getSheets()[0];
    blatt.setName(BLATT_NAME);
    blatt.appendRow(SHEET_SPALTEN);
  }
  return ss.getSheetByName(BLATT_NAME) || ss.getSheets()[0];
}

function findeZeile(blatt, id) {
  const daten = blatt.getDataRange().getValues();
  for (let i = 1; i < daten.length; i++) {
    if (daten[i][0] === id) return i + 1; // Sheet-Zeilen sind 1-basiert
  }
  return -1;
}

// Lädt eine Vorlagendatei aus Drive (legt sie beim ersten Mal mit
// Platzhaltertext an) und ersetzt {{name}}/{{von}}/{{bis}}/{{haus}}.
function holeVorlage(schluessel, werte) {
  const eintrag = VORLAGEN_DATEIEN[schluessel];
  const dateien = DriveApp.getFilesByName(eintrag.name);
  let datei;
  if (dateien.hasNext()) {
    datei = dateien.next();
  } else {
    datei = DriveApp.createFile(eintrag.name, eintrag.standard, MimeType.PLAIN_TEXT);
  }
  let text = datei.getBlob().getDataAsString();
  Object.keys(werte).forEach((k) => {
    text = text.split(`{{${k}}}`).join(werte[k]);
  });
  return text;
}

// Deutsches Datumsformat für Betreffzeilen, passend zur Website.
function formatiereDatum(isoDatum) {
  const [j, m, t] = isoDatum.split("-");
  return `${t}.${m}.${j}`;
}

// Sheets wandelt Zellen, die wie ein Datum aussehen (z. B. "2026-08-15"),
// beim Schreiben automatisch in ein echtes Datumsobjekt um — beim
// Zurücklesen kommt dann kein Text mehr, sondern ein Date. Normalisiert
// beides auf "yyyy-MM-dd", damit alsGanztagesEnde() & Co. verlässlich
// funktionieren, egal was aus der Zelle kommt.
function zuISODatum(wert) {
  if (wert instanceof Date) {
    return Utilities.formatDate(wert, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(wert);
}

// Google: end.date bei ganztägigen Events ist exklusiv (Tag NACH dem
// letzten belegten Tag). Unser "bis" von der Website ist inklusive.
function alsGanztagesEnde(bisISO) {
  const datum = new Date(bisISO + "T00:00:00");
  datum.setDate(datum.getDate() + 1);
  return Utilities.formatDate(datum, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// Betreffzeilen zweisprachig (DE/FR) — kurz genug, um im Code statt in
// einer eigenen Vorlagendatei zu bleiben.
function betreffZusagen(sprache, name, von, bis) {
  return sprache === "fr"
    ? `Confirmation de la demande de réservation ${HAUS_NAME} – ${name}, ${formatiereDatum(von)} – ${formatiereDatum(bis)}`
    : `Bestätigung Reservationsanfrage ${HAUS_NAME} – ${name}, ${formatiereDatum(von)} – ${formatiereDatum(bis)}`;
}

function betreffAblehnen(sprache, name, von, bis) {
  return sprache === "fr"
    ? `Refus de la demande de réservation ${HAUS_NAME} – ${name}, ${formatiereDatum(von)} – ${formatiereDatum(bis)}`
    : `Ablehnung Reservationsanfrage ${HAUS_NAME} – ${name}, ${formatiereDatum(von)} – ${formatiereDatum(bis)}`;
}

function doPost(e) {
  const daten = JSON.parse(e.postData.contents);
  const { name, email, telefon, von, bis, erwachsene, kinder, tiere, tierart, sprache } = daten;

  const kalender = getKalender();

  // Serverseitig nochmal prüfen, falls zwei Gäste gleichzeitig anfragen.
  const kollisionen = kalender.getEvents(
    new Date(von + "T00:00:00"),
    new Date(alsGanztagesEnde(bis) + "T00:00:00")
  );
  if (kollisionen.length > 0) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, fehler: "belegt" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const id = Utilities.getUuid();
  const angefragtEvent = kalender.createAllDayEvent(
    `${name} (ANGEFRAGT)`,
    new Date(von + "T00:00:00"),
    new Date(alsGanztagesEnde(bis) + "T00:00:00")
  );

  const blatt = getSheet();
  blatt.appendRow([
    id, new Date(), "haus1", name, email, telefon, von, bis,
    erwachsene, kinder, tiere, tierart || "", "angefragt", angefragtEvent.getId(),
    sprache === "fr" ? "fr" : "de"
  ]);

  const webAppUrl = ScriptApp.getService().getUrl();
  const zusagenLink = `${webAppUrl}?action=zusagen&id=${encodeURIComponent(id)}`;
  const ablehnenLink = `${webAppUrl}?action=ablehnen&id=${encodeURIComponent(id)}`;

  const htmlBody = `
    <p>Neue Reservationsanfrage für ${HAUS_NAME}:</p>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>E-Mail:</strong> ${email}</li>
      <li><strong>Telefon:</strong> ${telefon}</li>
      <li><strong>Zeitspanne:</strong> ${formatiereDatum(von)} – ${formatiereDatum(bis)}</li>
      <li><strong>Erwachsene:</strong> ${erwachsene}, <strong>Kinder:</strong> ${kinder}, <strong>Tiere:</strong> ${tiere}${tierart ? " (" + tierart + ")" : ""}</li>
    </ul>
    <p>
      <a href="${zusagenLink}" style="display:inline-block;padding:10px 20px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:4px;">Zusagen</a>
      &nbsp;&nbsp;
      <a href="${ablehnenLink}" style="display:inline-block;padding:10px 20px;background:#c62828;color:#fff;text-decoration:none;border-radius:4px;">Ablehnen</a>
    </p>
  `;

  MailApp.sendEmail({
    to: VERWALTER_EMAIL,
    subject: `Reservationsanfrage ${HAUS_NAME} – ${name}, ${formatiereDatum(von)} – ${formatiereDatum(bis)}`,
    htmlBody
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function seitenAusgabe(html) {
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Rendert eine Seite mit Bestätigungstext + Mail-Link. Versucht zusätzlich
// automatisch weiterzuleiten (funktioniert meist, aber nicht garantiert je
// nach Browser/Mail-App) — der sichtbare Button ist deshalb immer da, falls
// die automatische Weiterleitung nicht greift.
function mailSeite(ueberschrift, mailtoLink) {
  return seitenAusgabe(`
    <div style="font-family:sans-serif;max-width:480px;margin:40px auto;text-align:center;">
      <h2>${ueberschrift}</h2>
      <p><a href="${mailtoLink}" style="display:inline-block;padding:12px 24px;background:#b5654a;color:#fff;text-decoration:none;border-radius:6px;font-size:16px;">Antwort-Mail öffnen</a></p>
      <p style="color:#888;font-size:13px;">Öffnet dein Standard-Mailprogramm (Mail, Outlook, Gmail-App) mit vorausgefülltem Empfänger und Betreff.</p>
    </div>
    <script>window.location.href = ${JSON.stringify(mailtoLink)};</script>
  `);
}

function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;
  const blatt = getSheet();
  const zeile = findeZeile(blatt, id);

  if (zeile === -1) {
    return seitenAusgabe("<p>Anfrage nicht gefunden (evtl. schon bearbeitet).</p>");
  }

  const werte = blatt.getRange(zeile, 1, 1, SHEET_SPALTEN.length).getValues()[0];
  const [, , , name, email, telefon, vonRoh, bisRoh, erwachsene, kinder, tiere, tierart, status, eventId, sprache] = werte;
  const von = zuISODatum(vonRoh);
  const bis = zuISODatum(bisRoh);
  const spracheKlein = sprache === "fr" ? "fr" : "de";
  const platzhalter = { name, von: formatiereDatum(von), bis: formatiereDatum(bis), haus: HAUS_NAME };

  // Absicherung gegen Doppelklicks (z. B. durch Browser-Cache-Verwirrung):
  // eine Anfrage, die schon zugesagt/abgelehnt wurde, wird nicht nochmal
  // verarbeitet.
  if (status === "bestätigt" || status === "abgelehnt") {
    return seitenAusgabe(`<p>Diese Anfrage wurde bereits bearbeitet (Status: ${status}).</p>`);
  }

  if (action === "ablehnen") {
    blatt.getRange(zeile, 13).setValue("abgelehnt"); // Spalte "status"
    const text = holeVorlage(`ablehnen-${spracheKlein}`, platzhalter);
    const mailtoLink =
      `mailto:${encodeURIComponent(email)}` +
      `?subject=${encodeURIComponent(betreffAblehnen(spracheKlein, name, von, bis))}` +
      `&body=${encodeURIComponent(text)}`;
    return mailSeite("Anfrage abgelehnt.", mailtoLink);
  }

  if (action === "zusagen") {
    const kalender = getKalender();
    const event = kalender.getEventById(eventId);
    if (event) {
      // Titel ohne "(ANGEFRAGT)" -> zählt ab jetzt automatisch als "belegt".
      // Kontaktdaten kommen in die Beschreibung, die die Website nie liest.
      event.setTitle(name);
      event.setDescription(
        `E-Mail: ${email}\nTelefon: ${telefon}\n` +
        `Erwachsene: ${erwachsene}, Kinder: ${kinder}, Tiere: ${tiere}${tierart ? " (" + tierart + ")" : ""}`
      );
    }

    blatt.getRange(zeile, 13).setValue("bestätigt"); // Spalte "status"

    const text = holeVorlage(`zusagen-${spracheKlein}`, platzhalter);
    const mailtoLink =
      `mailto:${encodeURIComponent(email)}` +
      `?subject=${encodeURIComponent(betreffZusagen(spracheKlein, name, von, bis))}` +
      `&body=${encodeURIComponent(text)}`;
    return mailSeite("Buchung bestätigt.", mailtoLink);
  }

  return seitenAusgabe("<p>Unbekannte Aktion.</p>");
}
