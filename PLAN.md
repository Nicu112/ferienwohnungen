# Ferienwohnungen Nicu — Plan

Stand: 2026-08-17. Zwei Häuser, je ein eigenes Google-Konto. Reservationsanfragen
laufen komplett über Google Calendar + Gmail, ohne Login und ohne Kreditkarte.
Das Design entsteht später separat in Claude Design und wird nur eingehängt.

## Grundidee

Statische Website (HTML/CSS/Vanilla-JS, kein Framework, kein Build-Schritt) mit
zwei Tabs "Haus 1" / "Haus 2". Jeder Tab zeigt ein eigenes Kalenderraster (aus
der Google Calendar API gelesen) und ein Anfrageformular. Schreibender Teil
(Kalendereintrag + Mail) läuft über ein kleines Google Apps Script, das im
jeweiligen Google-Konto des Hauses deployt wird — kein Server, keine Firebase-
Rechnung, keine Passwörter im Code.

```
Gast: 1. Klick auf freien Tag = Anreise, 2. Klick = Abreise
      → Formular: Erwachsene/Kinder/Tiere (Zähler), Name, E-Mail, Telefon
      → Button "Buchung anfragen"
        │
        │  POST (Name, E-Mail, Telefon, Zeitspanne, Erwachsene/Kinder/Tiere)
        ▼
Apps Script im Google-Konto des Hauses
        ├─ prüft: ist die Zeitspanne noch komplett frei? (sonst Fehlermeldung, kein Eintrag)
        ├─ legt Eintrag "ANGEFRAGT" im öffentlichen Kalender "Verfügbarkeit" an (nur Status, kein Name)
        ├─ legt vollen Eintrag (Name, Personen, Kontakt) im privaten Kalender "Buchungen" an
        ├─ schickt Mail an die vom Verwalter festgelegte Empfänger-Adresse
        │     (unabhängig vom technischen Google-Konto des Hauses)
        │     Betreff: Reservationsanfrage Haus X – Name, Zeitspanne
        │     Body: Name, E-Mail, Telefon, Zeitspanne, Erwachsene/Kinder/Tiere
        │     + Buttons "Annehmen" / "Ablehnen"
        └─ schreibt Zeile ins Google Sheet (Archiv)
                │
      Klick "Annehmen" in der Mail
                ▼
      Apps Script ändert Eintrag ANGEFRAGT → BELEGT (grau) im Kalender "Verfügbarkeit"
      (der private Kalender "Buchungen" hat Name/E-Mail/Telefon schon seit der Anfrage)
      optional: Bestätigungsmail an den Gast (siehe unten)

      Klick "Ablehnen" in der Mail
                ▼
      Öffnet Bestätigungsseite: gibt die Tage in "Verfügbarkeit" sofort wieder frei
      und entfernt den Eintrag in "Buchungen", zeigt darunter einen Button
      "Antwort an Gast" mit vorausgefülltem, editierbarem Absage-Text
```

Kein Firebase in Phase 1 — es würde nichts leisten, was Apps Script nicht
ohnehin tut, und der Kalender ist bereits die Datenbank. Bleibt später
nachrüstbar (z. B. für ein Admin-Dashboard).

## Datenschutz-Regel — zwei Kalender pro Haus

Der Kalender muss öffentlich lesbar sein, damit die Website ihn anzeigen kann.
Öffentlich = jeder kann die Rohdaten abrufen. Gleichzeitig muss der Verwalter
aber sofort sehen können, wer wann belegt hat — ohne extra in Mail oder Sheet
nachzuschauen. Lösung: **pro Haus zwei Kalender im selben Google-Konto**.

- **„Verfügbarkeit" (öffentlich, Quelle für die Website):** Apps Script trägt
  hier nur `ANGEFRAGT` bzw. `BELEGT` ein, sonst nichts. Das ist der Kalender,
  den die Website per API-Key ausliest und im Raster anzeigt.
- **„Buchungen" (privat, das ist dein normaler Google-Kalender):** Apps
  Script trägt hier den vollständigen Eintrag ein — Titel z. B.
  "Nicu Wangler, 4 Erw. / 2 Kind. / 1 Hund", Zeitspanne, Kontakt in der
  Beschreibung. Diesen Kalender siehst du einfach, wenn du wie gewohnt deine
  Google-Calendar-App öffnest — kein zusätzlicher Schritt nötig.

Mail und Sheet (siehe unten) bleiben zusätzlich als Archiv/Backup, sind aber
für den Alltag nicht mehr nötig, weil der private Kalender bereits alles
zeigt.

## Datenmodell (Sheet-Zeile, entspricht dem Mail-Inhalt)

`haus, name, email, telefon, von, bis, erwachsene, kinder, tiere,
status(angefragt/bestätigt/abgelehnt), calendarEventIdOeffentlich,
calendarEventIdPrivat, timestamp`

## Kalender-Zustände im Raster (Gast-Ansicht)

Drei Zustände pro Tag, aus dem öffentlichen Kalender "Verfügbarkeit" gelesen:

| Zustand | Anzeige | Klickbar? |
|---|---|---|
| Frei | normal | ja |
| Angefragt (ANGEFRAGT-Eintrag vorhanden) | Text "Reservation angefragt" | nein |
| Belegt (BELEGT-Eintrag vorhanden) | grau hinterlegt | nein |

**Auswahl der Zeitspanne:** 1. Klick auf einen freien Tag = Anreise, 2. Klick
= Abreise, die Spanne dazwischen wird hervorgehoben. Liegt zwischen den
beiden Klicks ein blockierter Tag (angefragt oder belegt), ist die Auswahl
ungültig — Fehlermeldung, Auswahl wird zurückgesetzt. Klick auf den bereits
gewählten Starttag setzt die Auswahl zurück (üblicher Datepicker-Umgang).

## Formular

Erscheint nach gültiger Zeitspannen-Auswahl. Pflichtfelder: Name, E-Mail,
Telefon, mindestens 1 Erwachsener. Honeypot-Feld gegen einfache Bots.
Button "Buchung anfragen" ist erst aktiv, wenn alle Pflichtfelder gültig
ausgefüllt sind.

Plus/Minus-Zähler (reines Markup, per CSS frei gestaltbar):
- Erwachsene: 1–10
- Kinder: 0–8
- Tiere: 0–3

## Annehmen / Ablehnen — Details

Beide Buttons in der Anfrage-Mail sind Links auf die Apps-Script-Web-App
(kein Login nötig, funktioniert direkt vom Handy aus der Mail-App).

- **Annehmen:** setzt den öffentlichen Eintrag von ANGEFRAGT auf BELEGT (grau).
  Der private Kalender hat Name/E-Mail/Telefon bereits seit der Anfrage.
  Zusätzlich schickt Apps Script automatisch eine Bestätigungsmail an den
  Gast mit vorgefertigtem Text (Zeitspanne, Haus, ggf. Ankunftshinweise) —
  fest einprogrammierte Vorlage, kein manueller Schritt nötig (anders als
  bei Ablehnen, wo der Text vor dem Senden editierbar sein soll).
- **Ablehnen:** ein Klick kann technisch nicht gleichzeitig den Kalender
  freigeben *und* dein Mail-Programm mit einem fertigen Text öffnen (zwei
  unterschiedliche Vorgänge: Server-Aktion vs. lokaler Mail-Client). Deshalb
  zweistufig, fühlt sich aber wie ein Ablauf an: Klick öffnet eine
  Bestätigungsseite, die sofort (a) die Tage im öffentlichen Kalender wieder
  freigibt und den Eintrag im privaten Kalender entfernt, und (b) direkt
  darunter einen Button "Antwort an Gast" mit vorausgefülltem, editierbarem
  Absagetext (Vorlage, du kannst den Wortlaut anpassen) zeigt.

## Sicherheit gegen Missbrauch

- Angefragte Tage werden sofort im öffentlichen Kalender blockiert, damit
  niemand sonst dieselbe Spanne anfragt, solange sie offen ist.
- Bestätigt/abgelehnt wird per Klick auf einen Link in der Mail (Handy-tauglich,
  kein Login nötig).
- Kein automatisches Verfallsdatum für Anfragen — bewusste Entscheidung, du
  räumst manuell auf.
- API-Key der Calendar API wird in Phase 4 auf die Domain eingeschränkt.

## Technischer Hinweis für später

Apps-Script-Web-Apps brauchen einen kleinen Kniff gegen CORS: der POST-Body
wird als `text/plain` mit JSON-Inhalt gesendet statt als `application/json`.
Sieht im Code ungewohnt aus, ist aber Standard bei Apps Script und funktioniert
zuverlässig.

## Mehrsprachigkeit (DE / FR / EN)

Umschalter oben rechts (Position gehört später dem Design), plus automatische
Erkennung der Gerätesprache beim ersten Besuch (`navigator.language`), danach
merkt sich die Seite die manuelle Wahl (localStorage). Technisch als kleines
`i18n.js` mit einem Text-Wörterbuch pro Sprache; jedes Text-Element im Markup
trägt ein `data-i18n="key"`-Attribut, das JS ersetzt den Inhalt beim Laden
bzw. beim Umschalten — kein Neuladen der Seite nötig.

Das deckt die Texte der Kalender/Formular-Bausteine ab (Tagesstatus,
Formularlabels, Fehlermeldungen, Mailvorlagen). Die eigentlichen
Marketing-Inhalte der Seite (Beschreibungstexte der Häuser etc.) kommen erst
mit dem Design in Phase 5 dazu — die Übersetzungen dafür brauche ich dann
von dir in allen drei Sprachen, die erfinde ich nicht selbst.

## Mobile

Die Kalender- und Formular-Bausteine werden von Anfang an responsive und
touch-tauglich gebaut (Rasterlayout, Tap-Ziele ausreichend gross, kein
Hover-abhängiges Verhalten) — unabhängig vom späteren visuellen Design in
Phase 5, das darauf aufbaut statt es zu ersetzen.

## Einhängepunkte fürs spätere Design (Claude Design)

Die Technik wird als zwei ungestylte Bausteine gebaut, die per Platzhalter-Div
eingehängt werden. Kein Layout-CSS von der Technik-Seite, nur Funktions-Markup:

```html
<div data-kalender="haus1"></div>
<div data-anfrage="haus1"></div>
<script src="/js/app.js" type="module"></script>
```

Alle Konten-/Kalender-IDs liegen in einer einzigen `config.js` — beim Design
wird nichts davon angefasst.

## Phasenplan

| Phase | Inhalt |
|---|---|
| 0 | Pro Haus: neuen Kalender "Verfügbarkeit" anlegen und auf "öffentlich" stellen, Kalender-ID notieren (der private Kalender "Buchungen" kann der bestehende Standardkalender sein, bleibt privat). Google-Cloud-Projekt + Calendar-API-Key erzeugen. Apps-Script-Projekt im jeweiligen Konto anlegen. |
| 1 | Statische Seite, 2 Tabs, eigenes Monatsraster liest beide Kalender per API-Key, zeigt die drei Zustände frei/angefragt/belegt (nur Anzeige, noch keine Anfrage möglich) |
| 2 | Zeitspanne per 2-Klick anwählbar inkl. Validierung (keine blockierten Tage in der Spanne), Formular mit Zählern + Name/E-Mail/Telefon, Sprachumschalter DE/FR/EN mit Geräte-Erkennung, noch ohne Absenden |
| 3 | Apps Script pro Konto: Verfügbarkeitsprüfung → Eintrag in beiden Kalendern → Mail mit Annehmen/Ablehnen-Links → Sheet-Eintrag. Annehmen-Fluss und Ablehnen-Fluss (inkl. Antwortvorlage) einzeln getestet. |
| 4 | Deploy auf GitHub Pages, API-Key auf Domain eingeschränkt, Mobile-Test auf echtem Handy |
| 5 | Design in Claude Design, die zwei Platzhalter-Divs an der richtigen Stelle einsetzen |

## Zwei getrennte Adressen pro Haus — nicht verwechseln

- **Technisches Google-Konto:** besitzt die beiden Kalender, führt das Apps
  Script aus. Rein technische Basis im Hintergrund, taucht für Gäste oder
  Verwalter nirgends auf.
- **Verwalter-E-Mail-Adresse:** die Adresse, an die Anfrage-Mails
  tatsächlich zugestellt werden. Kann eine ganz andere Adresse sein als das
  technische Konto — z. B. die private oder geschäftliche Mail-Adresse des
  Verwalters. Kann pro Haus gleich oder unterschiedlich sein, das entscheidest
  du bei der Einrichtung.

## Was ich von dir brauche (unkritisch, kein Passwort)

- Pro Haus: Kalender-ID des neuen öffentlichen Kalenders "Verfügbarkeit"
  (nach "öffentlich machen" sichtbar in den Kalender-Einstellungen)
- Pro Haus: die Verwalter-E-Mail-Adresse, an die Anfragen zugestellt werden
  sollen (siehe oben — unabhängig vom technischen Google-Konto)
- Hausnamen, falls "Haus 1" / "Haus 2" nur Platzhalter waren

Apps Script und Web-App-Deploy machst du selbst in deinem Browser, mit
Klickanleitung von mir Schritt für Schritt — ich melde mich in keinem
Google-Konto an und will kein Passwort im Chat sehen.

## Später sinnvoll (jetzt bewusst nicht Teil des Plans)

- Automatisches Verfallsdatum für Anfragen (aktuell abgelehnt)
- Admin-Dashboard (dann macht Firebase Sinn)
- Impressum/Datenschutzerklärung (in der Schweiz bei Kontaktformular mit
  Personendaten sinnvoll/nötig — separat klären)
