// Eigenes Monatsraster (kein iFrame). Liest im Testmodus MOCK_EVENTS +
// TEST_REQUESTS; ab Phase 1 hier den echten fetch() gegen die Calendar API
// einsetzen (Stelle markiert unten) und CONFIG.useMockData auf false stellen.

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

function ermittleTagesStatus(hausKey, isoDatum) {
  const alle = [...(MOCK_EVENTS[hausKey] || []), ...(TEST_REQUESTS[hausKey] || [])];
  let status = "FREI";
  for (const ev of alle) {
    if (isoDatum >= ev.von && isoDatum <= ev.bis) {
      if (ev.status === "BELEGT") return "BELEGT"; // BELEGT hat Vorrang
      status = "ANGEFRAGT";
    }
  }
  return status;
}

// Prüft, ob zwischen zwei Tagen (exklusive der Ränder) ein blockierter Tag liegt.
function hatBlockiertenTagDazwischen(hausKey, startISO, endeISO) {
  const start = new Date(startISO);
  const ende = new Date(endeISO);
  for (let d = new Date(start); d < ende; d.setDate(d.getDate() + 1)) {
    const iso = zuISO(d);
    if (iso === startISO) continue;
    if (ermittleTagesStatus(hausKey, iso) !== "FREI") return true;
  }
  return false;
}

function renderKalender(hausKey, container) {
  const state = HAUS_STATE[hausKey];
  const { jahr, monat } = state;
  const ersterTag = new Date(jahr, monat, 1);
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate();
  const startOffset = WOCHENTAGE_MO_START.indexOf(ersterTag.getDay());

  const monatsName = ersterTag.toLocaleDateString(AKTUELLE_SPRACHE, { month: "long", year: "numeric" });

  let html = `
    <div class="kalender-kopf">
      <button type="button" class="kalender-nav" data-nav="prev" aria-label="${t("calendar.prev")}">‹</button>
      <span class="kalender-monat">${monatsName}</span>
      <button type="button" class="kalender-nav" data-nav="next" aria-label="${t("calendar.next")}">›</button>
    </div>
    <div class="kalender-hinweis" data-hinweis>${state.fehler ? "" : state.start ? t("calendar.hint.end") : t("calendar.hint.start")}</div>
    ${state.fehler ? `<div class="kalender-fehler" data-fehler>${t("calendar.error.blocked")}</div>` : ""}
    <div class="kalender-raster">
  `;

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="tag tag--leer"></div>`;
  }

  for (let tag = 1; tag <= anzahlTage; tag++) {
    const datum = new Date(jahr, monat, tag);
    const iso = zuISO(datum);
    const status = ermittleTagesStatus(hausKey, iso);
    const istAusgewaehlt =
      (state.start && iso === state.start) || (state.ende && iso === state.ende);
    const imBereich =
      state.start && state.ende && iso > state.start && iso < state.ende;

    const klassen = ["tag", `tag--${status.toLowerCase()}`];
    if (istAusgewaehlt) klassen.push("tag--ausgewaehlt");
    if (imBereich) klassen.push("tag--im-bereich");

    const klickbar = status === "FREI";
    const label = status === "BELEGT" ? t("calendar.booked") : status === "ANGEFRAGT" ? t("calendar.requested") : "";

    html += `
      <button type="button" class="${klassen.join(" ")}" data-datum="${iso}" ${klickbar ? "" : "disabled"}>
        <span class="tag-nummer">${tag}</span>
        ${label ? `<span class="tag-label">${label}</span>` : ""}
      </button>
    `;
  }

  html += `</div>`;

  // Nur auf Mobile sichtbar (siehe CSS): dort verzichten die Kästchen auf den
  // Text "belegt"/"angefragt" (verzieht sonst das Raster), stattdessen erklärt
  // diese Legende die Farben.
  html += `
    <div class="kalender-legende">
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--frei"></span>${t("calendar.free")}</span>
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--angefragt"></span>${t("calendar.requested")}</span>
      <span class="legende-eintrag"><span class="legende-swatch legende-swatch--belegt"></span>${t("calendar.booked")}</span>
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
    btn.addEventListener("click", () => tagAngeklickt(hausKey, container, btn.getAttribute("data-datum")));
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

function tagAngeklickt(hausKey, container, iso) {
  const state = HAUS_STATE[hausKey];

  state.fehler = false;

  if (!state.start) {
    state.start = iso;
    state.ende = null;
  } else if (!state.ende) {
    if (iso <= state.start) {
      state.start = iso;
    } else if (hatBlockiertenTagDazwischen(hausKey, state.start, iso)) {
      state.fehler = true;
      state.start = null;
      state.ende = null;
    } else {
      state.ende = iso;
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
