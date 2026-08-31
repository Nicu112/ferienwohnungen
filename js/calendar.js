// Eigenes Monatsraster (kein iFrame). Pro Haus mit hinterlegter
// googleCalendarId wird genau ein Google-Kalender per Calendar API gelesen
// — derselbe, in den auch Apps Script schreibt und in dem der Admin direkt
// eigene Termine anlegen kann (siehe parseEventTitel). Häuser ohne
// googleCalendarId laufen weiter auf MOCK_EVENTS. TEST_REQUESTS
// (clientseitige Testanfragen) werden in beiden Fällen zusätzlich überlagert.

const WOCHENTAGE_MO_START = [1, 2, 3, 4, 5, 6, 0]; // Mo..So, JS: So=0

const HAUS_STATE = {};

function initHausState(hausKey) {
  const heute = new Date();
  HAUS_STATE[hausKey] = {
    jahr: heute.getFullYear(),
    monat: heute.getMonth(), // 0-basiert
    start: null,
    ende: null
  };
}

// Bewusst ohne toISOString(): die geht über UTC und kann je nach Zeitzone
// und Uhrzeit den Tag verschieben. Stattdessen aus lokalen Datumsteilen bauen.
function zuISO(datum) {
  const j = datum.getFullYear();
  const m = String(datum.getMonth() + 1).padStart(2, "0");
  const t = String(datum.getDate()).padStart(2, "0");
  return `${j}-${m}-${t}`;
}

// Wie zuISO(), nur einen Tag zurück — für die Umrechnung des exklusiven
// end.date ganztägiger Google-Events (siehe ladeMonatsEvents). Bewusst über
// lokale Datumsteile statt new Date(isoString), das ginge wieder über UTC.
function isoMinusEinTag(isoDatum) {
  const [j, m, t] = isoDatum.split("-").map(Number);
  const datum = new Date(j, m - 1, t);
  datum.setDate(datum.getDate() - 1);
  return zuISO(datum);
}

function hatEchtenKalender(hausKey) {
  const haus = CONFIG.haeuser[hausKey];
  return Boolean(haus.googleCalendarId && CONFIG.googleCalendarApiKey);
}

// JEDES Event im Kalender blockiert die Tage automatisch als "belegt" —
// der Admin kann direkt in Google Calendar einen Termin mit beliebigem
// Titel eintragen (z. B. "Renovation", "Hans"), kein spezielles Format
// nötig. Einzige Ausnahme: ein Titel, der auf "(ANGEFRAGT)" endet, gilt als
// offene Buchungsanfrage (gelb) — das trägt das Formular auf der Website
// automatisch so ein. Ein optionales "(BELEGT)"-Suffix aus älteren
// Einträgen wird nur für die Anzeige entfernt, ist aber nicht mehr nötig.
function parseEventTitel(titelRoh) {
  const titel = (titelRoh || "").trim();

  const angefragtMatch = titel.match(/^(.*?)\s*\(angefragt\)\s*$/i);
  if (angefragtMatch) {
    return { name: angefragtMatch[1].trim(), status: "ANGEFRAGT" };
  }

  const belegtMatch = titel.match(/^(.*?)\s*\(belegt\)\s*$/i);
  return { name: belegtMatch ? belegtMatch[1].trim() : titel, status: "BELEGT" };
}

// Lädt die Events des echten Kalenders — bewusst ohne Cache: die Seite
// bleibt oft länger offen (Formular ausfüllen, Mail-Antworten abwarten),
// und ein veralteter Stand hätte schon zu verwirrenden "belegt"-Meldungen
// für längst freie Tage geführt.
async function ladeMonatsEvents(hausKey, jahr, monat) {
  const haus = CONFIG.haeuser[hausKey];
  const timeMin = new Date(jahr, monat, 1).toISOString();
  const timeMax = new Date(jahr, monat + 1, 1).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(haus.googleCalendarId)}/events` +
    `?key=${encodeURIComponent(CONFIG.googleCalendarApiKey)}` +
    `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true&orderBy=startTime`;

  // cache: "no-store" erzwingen — ohne das kann der Browser eine identische
  // Anfrage-URL (gleicher Monat) aus seinem HTTP-Cache beantworten, statt
  // wirklich neu bei Google nachzufragen. Genau das könnte erklären, warum
  // eine frisch angelegte ANGEFRAGT-Buchung auf der Seite nicht auftaucht:
  // der Browser zeigt einfach eine ältere, zwischengespeicherte Antwort.
  const antwort = await fetch(url, { cache: "no-store" });
  if (!antwort.ok) throw new Error(`Google Calendar API: ${antwort.status}`);
  const daten = await antwort.json();

  const events = (daten.items || [])
    .map((ev) => {
      const vonISO = ev.start?.date || (ev.start?.dateTime || "").slice(0, 10);
      const bisRohISO = ev.end?.date || (ev.end?.dateTime || "").slice(0, 10);
      if (!vonISO || !bisRohISO) return null;
      // Google: end.date bei ganztägigen Events ist der Tag NACH dem letzten
      // belegten Tag (Checkout-Tag), unser "bis" ist dagegen inklusive.
      const bisISO = ev.end?.date ? isoMinusEinTag(bisRohISO) : bisRohISO;
      const { name, status } = parseEventTitel(ev.summary);
      return { von: vonISO, bis: bisISO, status, name };
    })
    .filter(Boolean);

  return events;
}

// Liefert Status + anzuzeigenden Namen für einen Tag in einem Rutsch (statt
// zwei getrennter Durchläufe) — Name kommt vom Event, das den Status setzt;
// fehlt er (z. B. alte MOCK_EVENTS ohne name-Feld), fällt render darauf
// zurück, das generische Status-Wort zu zeigen.
function ermittleTagesInfo(hausKey, isoDatum, echteEvents) {
  const basis = echteEvents || MOCK_EVENTS[hausKey] || [];
  const alle = [...basis, ...(TEST_REQUESTS[hausKey] || [])];
  let status = "FREI";
  let name = "";
  for (const ev of alle) {
    if (isoDatum >= ev.von && isoDatum <= ev.bis) {
      if (ev.status === "BELEGT") return { status: "BELEGT", name: ev.name || "" }; // BELEGT hat Vorrang
      status = "ANGEFRAGT";
      name = ev.name || "";
    }
  }
  return { status, name };
}

function ermittleTagesStatus(hausKey, isoDatum, echteEvents) {
  return ermittleTagesInfo(hausKey, isoDatum, echteEvents).status;
}

// Weist jeder Buchung (getrennt für BELEGT und ANGEFRAGT) abwechselnd Farb-
// variante 0/1 zu, chronologisch nach Anreisedatum sortiert -- so bekommen
// aufeinanderfolgende Aufenthalte unterscheidbare Farben (z. B. an dicht
// belegten Wochen erkennt man auf einen Blick, wo eine Buchung endet und die
// nächste beginnt). Map-Key ist das Event-Objekt selbst (bleibt innerhalb
// eines renderKalender()-Aufrufs stabil).
function baueFarbZuordnung(alleEvents) {
  const gruppen = { BELEGT: [], ANGEFRAGT: [] };
  alleEvents.forEach((ev) => {
    (ev.status === "BELEGT" ? gruppen.BELEGT : gruppen.ANGEFRAGT).push(ev);
  });
  const zuordnung = new Map();
  Object.values(gruppen).forEach((liste) => {
    [...liste]
      .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0))
      .forEach((ev, i) => zuordnung.set(ev, i % 2));
  });
  return zuordnung;
}

// Besetzt eine BESTÄTIGTE Buchung den NACHMITTAG dieses Tages? (Tag liegt in
// [von, bis) einer BELEGT-Buchung -- der Grenztag "bis" selbst zählt NICHT:
// dort ist der Gast ja schon abgereist, der Nachmittag ist frei für eine
// neue Anreise. Offene Anfragen fliessen hier bewusst NICHT ein -- die
// blockieren weiterhin den ganzen Tag, siehe klickbar-Berechnung unten.)
function nachmittagBelegt(alleEvents, isoDatum) {
  return alleEvents.some(
    (ev) => ev.status === "BELEGT" && ev.von <= isoDatum && isoDatum < ev.bis
  );
}

// Besetzt eine BESTÄTIGTE Buchung den VORMITTAG dieses Tages? (Tag liegt in
// (von, bis] einer BELEGT-Buchung -- der Grenztag "von" selbst zählt NICHT:
// dort reist der Gast ja erst nachmittags an, der Vormittag ist frei für
// eine neue Abreise.)
function vormittagBelegt(alleEvents, isoDatum) {
  return alleEvents.some(
    (ev) => ev.status === "BELEGT" && ev.von < isoDatum && isoDatum <= ev.bis
  );
}

const FARBE_VARIANTEN = {
  BELEGT: ["var(--farbe-kalender-belegt-a)", "var(--farbe-kalender-belegt-b)"],
  ANGEFRAGT: ["var(--farbe-angefragt-a)", "var(--farbe-angefragt-b)"]
};

// Wie ermittleTagesInfo(), liefert aber zusätzlich die Farbvariante (a/b) und
// erkennt zwei Fälle, in denen der Tag nur zur Hälfte belegt ist -- passend
// zur Wechseltag-Klickregel (nachmittagBelegt/vormittagBelegt) weiter oben:
// (1) eine Buchung endet hier, eine andere beginnt hier -- typisch bei
//     dichter Belegung (Abreise + Anreise am selben Datum). Beide Hälften
//     zeigen die jeweilige Buchungsfarbe.
// (2) nur EINE bestätigte Buchung berührt den Tag, aber genau an ihrem
//     Rand (Anreise- oder Abreisetag) -- die freie Hälfte wird weiss
//     dargestellt (wie ein normaler freier Tag), damit auf einen Blick
//     erkennbar ist, dass hier noch eine neue Buchung anschliessen könnte.
// In beiden Fällen wird kein Name gezeigt (welche Buchung wäre schon
// irreführend), stattdessen wird das Feld beim Rendern links/rechts
// zwischen den beiden Farben geteilt.
function ermittleTagesDarstellung(isoDatum, alleEvents, farbZuordnung) {
  const amTag = alleEvents.filter((ev) => isoDatum >= ev.von && isoDatum <= ev.bis);
  const belegt = amTag.filter((ev) => ev.status === "BELEGT");
  const relevant = belegt.length ? belegt : amTag;
  const status = belegt.length ? "BELEGT" : relevant.length ? "ANGEFRAGT" : "FREI";

  if (status === "FREI") return { status, name: "", geteilt: false };

  const endend = relevant.find((ev) => ev.bis === isoDatum);
  const beginnend = relevant.find((ev) => ev.von === isoDatum && ev !== endend);

  if (relevant.length === 2 && endend && beginnend && endend !== beginnend) {
    return {
      status,
      geteilt: true,
      name: "",
      linksFarbe: FARBE_VARIANTEN[status][farbZuordnung.get(endend) ?? 0],
      rechtsFarbe: FARBE_VARIANTEN[status][farbZuordnung.get(beginnend) ?? 0]
    };
  }

  const ev = relevant[0];

  // Nur eine (bestätigte) Buchung berührt den Tag, und zwar genau an ihrem
  // Rand -- die andere Hälfte ist frei (weiss), noch niemand hat sie belegt.
  if (status === "BELEGT" && relevant.length === 1) {
    const frei = "var(--farbe-flaeche)";
    const farbe = FARBE_VARIANTEN[status][farbZuordnung.get(ev) ?? 0];
    if (ev.von === isoDatum && ev.bis !== isoDatum) {
      // Anreisetag dieser Buchung: Vormittag frei, Nachmittag belegt.
      return { status, geteilt: true, name: "", linksFarbe: frei, rechtsFarbe: farbe };
    }
    if (ev.bis === isoDatum && ev.von !== isoDatum) {
      // Abreisetag dieser Buchung: Vormittag belegt, Nachmittag frei.
      return { status, geteilt: true, name: "", linksFarbe: farbe, rechtsFarbe: frei };
    }
  }

  return {
    status,
    geteilt: false,
    name: ev.name || "",
    variante: farbZuordnung.get(ev) ?? 0
  };
}

// Prüft, ob zwischen zwei Tagen (exklusive der Ränder) ein blockierter Tag liegt.
function hatBlockiertenTagDazwischen(hausKey, startISO, endeISO, echteEvents) {
  const start = new Date(startISO);
  const ende = new Date(endeISO);
  for (let d = new Date(start); d < ende; d.setDate(d.getDate() + 1)) {
    const iso = zuISO(d);
    if (iso === startISO) continue;
    if (ermittleTagesStatus(hausKey, iso, echteEvents) !== "FREI") return true;
  }
  return false;
}

async function renderKalender(hausKey, container) {
  const state = HAUS_STATE[hausKey];
  const { jahr, monat } = state;
  const haus = CONFIG.haeuser[hausKey];

  let echteEvents;
  let ladeFehler = false;
  if (hatEchtenKalender(hausKey)) {
    try {
      echteEvents = await ladeMonatsEvents(hausKey, jahr, monat);
    } catch (err) {
      console.error("Google Calendar konnte nicht geladen werden:", err);
      ladeFehler = true;
      echteEvents = [];
    }
  }

  // Zwischen dem await oben und hier kann der Nutzer schon weitergeklickt
  // haben (anderer Monat/Tab) — dann ist diese Antwort veraltet, verwerfen.
  if (HAUS_STATE[hausKey] !== state || state.jahr !== jahr || state.monat !== monat) return;

  const ersterTag = new Date(jahr, monat, 1);
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate();
  const startOffset = WOCHENTAGE_MO_START.indexOf(ersterTag.getDay());

  const monatsName = ersterTag.toLocaleDateString(AKTUELLE_SPRACHE, { month: "long", year: "numeric" });

  let html = `
    <div class="kalender-haus-titel">${escapeHtml(haus.name)}</div>
    <div class="kalender-kopf">
      <button type="button" class="kalender-nav" data-nav="prev" aria-label="${t("calendar.prev")}">‹</button>
      <span class="kalender-monat">${monatsName}</span>
      <button type="button" class="kalender-nav" data-nav="next" aria-label="${t("calendar.next")}">›</button>
    </div>
    <div class="kalender-hinweis" data-hinweis>${state.fehler ? "" : state.start ? t("calendar.hint.end") : t("calendar.hint.start")}</div>
    ${state.fehler ? `<div class="kalender-fehler" data-fehler>${t("calendar.error.blocked")}</div>` : ""}
    ${ladeFehler ? `<div class="kalender-fehler" data-fehler>${t("calendar.error.load")}</div>` : ""}
    <div class="kalender-raster">
  `;

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="tag tag--leer"></div>`;
  }

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  // Einmal pro Render berechnet (nicht pro Tag), damit die Abwechslungs-
  // Reihenfolge über den ganzen Monat konsistent bleibt.
  const alleEvents = [...(echteEvents || MOCK_EVENTS[hausKey] || []), ...(TEST_REQUESTS[hausKey] || [])];
  const farbZuordnung = baueFarbZuordnung(alleEvents);

  for (let tag = 1; tag <= anzahlTage; tag++) {
    const datum = new Date(jahr, monat, tag);
    const iso = zuISO(datum);
    const { status, name, geteilt, variante, linksFarbe, rechtsFarbe } =
      ermittleTagesDarstellung(iso, alleEvents, farbZuordnung);
    const istVergangen = datum < heute;
    const istAusgewaehlt =
      (state.start && iso === state.start) || (state.ende && iso === state.ende);
    const imBereich =
      state.start && state.ende && iso > state.start && iso < state.ende;

    const klassen = ["tag"];
    if (status === "FREI") {
      klassen.push("tag--frei");
    } else if (geteilt) {
      klassen.push(`tag--${status.toLowerCase()}`, "tag--geteilt");
    } else {
      klassen.push(`tag--${status.toLowerCase()}-${variante === 1 ? "b" : "a"}`);
    }
    if (istVergangen && status === "FREI") klassen.push("tag--vergangen");
    if (istAusgewaehlt) klassen.push("tag--ausgewaehlt");
    if (imBereich) klassen.push("tag--im-bereich");

    // Wechseltag-Regel: nur bei BESTÄTIGTEN Buchungen (status "BELEGT") ist
    // ein Tag, an dem nur eine Hälfte belegt ist, für die jeweils freie
    // Hälfte trotzdem wählbar -- Auschecken ist morgens, Einchecken
    // nachmittags. Beim 1. Klick (Anreise) zählt der Nachmittag, beim 2.
    // Klick (Abreise) der Vormittag; ist bereits eine ganze Zeitspanne
    // gewählt, gilt ein weiterer Klick wieder als neue Anreise. Offene
    // Anfragen (status "ANGEFRAGT") blockieren weiterhin den ganzen Tag --
    // da noch nicht sicher ist, ob die Anfrage überhaupt bestätigt wird.
    const zweiterKlickAusstehend = Boolean(state.start) && !state.ende;
    let klickbar = !istVergangen;
    if (status === "FREI") {
      // bleibt wie gesetzt
    } else if (status === "BELEGT") {
      klickbar =
        klickbar &&
        (zweiterKlickAusstehend ? !vormittagBelegt(alleEvents, iso) : !nachmittagBelegt(alleEvents, iso));
    } else {
      klickbar = false;
    }
    // Am Wechseltag (geteilt) bewusst kein Name -- welcher der beiden wäre
    // irreführend, die Farbteilung sagt schon "hier wechselt die Buchung".
    // Sonst bevorzugt der Name aus dem Event-Titel; nur wenn keiner
    // hinterlegt ist (z. B. MOCK_EVENTS ohne name-Feld), das generische Wort.
    const label = geteilt
      ? ""
      : name
      ? escapeHtml(name)
      : status === "BELEGT" ? t("calendar.booked") : status === "ANGEFRAGT" ? t("calendar.requested") : "";

    const stil = geteilt
      ? ` style="background: linear-gradient(90deg, ${linksFarbe} 50%, ${rechtsFarbe} 50%);"`
      : "";

    html += `
      <button type="button" class="${klassen.join(" ")}" data-datum="${iso}" ${klickbar ? "" : "disabled"}${stil}>
        <span class="tag-nummer">${tag}</span>
        ${label ? `<span class="tag-label">${label}</span>` : ""}
      </button>
    `;
  }

  html += `</div>`;

  // Kästchen zeigen den Namen statt "belegt"/"angefragt" — diese Legende
  // erklärt, was Grau/Gelb bedeutet. Auf Mobile bleibt der Name-Text
  // zusätzlich ausgeblendet (siehe CSS), da Namen unterschiedlich lang sind
  // und das enge Raster sonst verziehen.
  html += `
    <div class="kalender-legende">
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--frei"></span>${t("calendar.free")}</span>
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--angefragt"></span>${t("calendar.requested")}</span>
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--belegt"></span>${t("calendar.booked")}</span>
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--wechsel"></span>${t("calendar.turnover")}</span>
    </div>
  `;

  container.innerHTML = html;

  container.querySelector('[data-nav="prev"]').addEventListener("click", () => {
    wechsleMonat(hausKey, container, -1);
  });
  container.querySelector('[data-nav="next"]').addEventListener("click", () => {
    wechsleMonat(hausKey, container, 1);
  });
  container.querySelectorAll(".tag[data-datum]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => tagAngeklickt(hausKey, container, btn.getAttribute("data-datum"), jahr, monat));
  });
}

function wechsleMonat(hausKey, container, delta) {
  const state = HAUS_STATE[hausKey];
  state.monat += delta;
  if (state.monat < 0) {
    state.monat = 11;
    state.jahr -= 1;
  } else if (state.monat > 11) {
    state.monat = 0;
    state.jahr += 1;
  }
  renderKalender(hausKey, container);
}

async function tagAngeklickt(hausKey, container, iso, jahr, monat) {
  const state = HAUS_STATE[hausKey];

  state.fehler = false;

  if (!state.start) {
    state.start = iso;
    state.ende = null;
  } else if (!state.ende) {
    if (iso <= state.start) {
      state.start = iso;
    } else {
      // Echte Events frisch laden statt aus dem Speicher zu raten — sonst
      // würde ermittleTagesInfo() ohne Übergabe auf MOCK_EVENTS zurückfallen
      // und die Zwischentage anhand von Test-Fake-Daten statt des echten
      // Kalenders prüfen.
      let echteEvents;
      if (hatEchtenKalender(hausKey)) {
        try {
          echteEvents = await ladeMonatsEvents(hausKey, jahr, monat);
        } catch (err) {
          console.error("Google Calendar konnte nicht geladen werden:", err);
        }
      }
      if (hatBlockiertenTagDazwischen(hausKey, state.start, iso, echteEvents)) {
        state.fehler = true;
        state.start = null;
        state.ende = null;
      } else {
        state.ende = iso;
      }
    }
  } else {
    // neue Auswahl beginnt
    state.start = iso;
    state.ende = null;
  }

  renderKalender(hausKey, container);

  if (state.start && state.ende) {
    document.dispatchEvent(
      new CustomEvent("zeitspanne-gewaehlt", { detail: { hausKey, von: state.start, bis: state.ende } })
    );
  } else {
    document.dispatchEvent(new CustomEvent("zeitspanne-zurueckgesetzt", { detail: { hausKey } }));
  }
}
