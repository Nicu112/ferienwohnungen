// Anfrageformular: Zähler + Kontaktdaten. Absenden simuliert im Testmodus
// den Mailversand an CONFIG.haeuser[haus].verwalterEmail und blockiert die
// Zeitspanne lokal als ANGEFRAGT. Ab Phase 3 hier den echten fetch() gegen
// die Apps-Script-Web-App einsetzen (Stelle markiert unten).

const ZAEHLER_GRENZEN = {
  erwachsene: { min: 1, max: 10, start: 1 },
  kinder: { min: 0, max: 8, start: 0 },
  tiere: { min: 0, max: 3, start: 0 }
};

const FORM_STATE = {};

function initFormState(hausKey) {
  FORM_STATE[hausKey] = {
    von: null,
    bis: null,
    erwachsene: ZAEHLER_GRENZEN.erwachsene.start,
    kinder: ZAEHLER_GRENZEN.kinder.start,
    tiere: ZAEHLER_GRENZEN.tiere.start,
    tierart: "",
    name: "",
    email: "",
    telefonLand: "41",
    telefonNummer: "",
    telefonHatFuehrendeNull: false,
    abgeschickt: false,
    erfolgHtml: ""
  };
}

function formatiereDatum(iso) {
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

function escapeHtml(wert) {
  const div = document.createElement("div");
  div.textContent = wert;
  return div.innerHTML;
}

// Führende Null bleibt sichtbar (in Klammern), zählt aber nicht zur
// eigentlichen Nummer hinter der Ländervorwahl (siehe absenden()).
function telefonAnzeige(state) {
  return state.telefonHatFuehrendeNull ? `(0)${state.telefonNummer}` : state.telefonNummer;
}

function renderZaehler(hausKey, feld) {
  const aktuellerWert = FORM_STATE[hausKey][feld];
  return `
    <div class="zaehler" data-zaehler="${feld}">
      <label data-i18n="form.${feld === "erwachsene" ? "adults" : feld === "kinder" ? "children" : "pets"}"></label>
      <div class="zaehler-controls">
        <button type="button" class="zaehler-minus" data-aktion="minus" data-feld="${feld}">–</button>
        <span class="zaehler-wert" data-wert="${feld}">${aktuellerWert}</span>
        <button type="button" class="zaehler-plus" data-aktion="plus" data-feld="${feld}">+</button>
      </div>
    </div>
  `;
}

function renderFormular(hausKey, container) {
  const state = FORM_STATE[hausKey];
  container.innerHTML = `
    <h2 data-i18n="form.title"></h2>
    <p class="anfrage-zeitspanne" data-zeitspanne></p>
    ${renderZaehler(hausKey, "erwachsene")}
    ${renderZaehler(hausKey, "kinder")}
    ${renderZaehler(hausKey, "tiere")}
    <div class="tierart-wrapper" data-tierart-wrapper ${state.tiere > 0 ? "" : "hidden"}>
      <label class="feld-label" data-i18n="form.petType"></label>
      <input type="text" class="feld-input" data-feld-input="tierart" value="${escapeHtml(state.tierart)}" data-i18n-placeholder="form.petType.placeholder">
    </div>
    <label class="feld-label" data-i18n="form.name"></label>
    <input type="text" class="feld-input" data-feld-input="name" autocomplete="name" required value="${escapeHtml(state.name)}">
    <label class="feld-label" data-i18n="form.email"></label>
    <input type="email" class="feld-input" data-feld-input="email" autocomplete="email" required
      pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]+" value="${escapeHtml(state.email)}">
    <label class="feld-label" data-i18n="form.phone"></label>
    <div class="telefon-eingabe">
      <span class="telefon-plus">+</span>
      <input type="tel" inputmode="numeric" class="feld-input feld-input--vorwahl" data-feld-input="telefonLand"
        maxlength="2" autocomplete="tel-country-code" value="${escapeHtml(state.telefonLand)}">
      <input type="tel" inputmode="numeric" class="feld-input feld-input--nummer" data-feld-input="telefonNummer"
        autocomplete="tel-national" required value="${escapeHtml(telefonAnzeige(state))}">
    </div>
    <div class="honeypot" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
    <button type="button" class="anfrage-submit" data-submit disabled data-i18n="form.submit"></button>
    <div class="anfrage-erfolg" data-erfolg hidden></div>
  `;

  wendeUebersetzungAn();

  container.querySelectorAll("[data-aktion]").forEach((btn) => {
    btn.addEventListener("click", () => zaehlerAendern(hausKey, container, btn.dataset.feld, btn.dataset.aktion));
  });

  container.querySelector('[data-feld-input="telefonLand"]').addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
    FORM_STATE[hausKey].telefonLand = e.target.value;
    aktualisiereSubmitStatus(hausKey, container);
  });
  container.querySelector('[data-feld-input="telefonNummer"]').addEventListener("input", (e) => {
    const state = FORM_STATE[hausKey];
    const ziffern = e.target.value.replace(/\D/g, "");
    state.telefonHatFuehrendeNull = ziffern.startsWith("0");
    state.telefonNummer = state.telefonHatFuehrendeNull ? ziffern.slice(1) : ziffern;
    e.target.value = telefonAnzeige(state);
    aktualisiereSubmitStatus(hausKey, container);
  });
  container.querySelectorAll('[data-feld-input="name"], [data-feld-input="email"], [data-feld-input="tierart"]').forEach((input) => {
    input.addEventListener("input", (e) => {
      FORM_STATE[hausKey][e.target.getAttribute("data-feld-input")] = e.target.value;
      aktualisiereSubmitStatus(hausKey, container);
    });
  });

  container.querySelector("[data-submit]").addEventListener("click", () => absenden(hausKey, container));

  aktualisiereSubmitStatus(hausKey, container);

  // Nach einem Neu-Rendern (z. B. Sprachwechsel) den "bereits abgeschickt"-
  // Zustand wiederherstellen, statt ein leeres, aktives Formular zu zeigen.
  if (state.abgeschickt) {
    container.querySelector("[data-submit]").disabled = true;
    container.querySelectorAll("[data-feld-input]").forEach((el) => (el.disabled = true));
    container.querySelectorAll("[data-aktion]").forEach((el) => (el.disabled = true));
    const erfolgBox = container.querySelector("[data-erfolg]");
    erfolgBox.hidden = false;
    erfolgBox.innerHTML = state.erfolgHtml;
  }
}

function zaehlerAendern(hausKey, container, feld, aktion) {
  const grenzen = ZAEHLER_GRENZEN[feld];
  const state = FORM_STATE[hausKey];
  let wert = state[feld] + (aktion === "plus" ? 1 : -1);
  wert = Math.max(grenzen.min, Math.min(grenzen.max, wert));
  state[feld] = wert;
  container.querySelector(`[data-wert="${feld}"]`).textContent = wert;

  if (feld === "tiere") {
    const wrapper = container.querySelector("[data-tierart-wrapper]");
    wrapper.hidden = wert === 0;
    if (wert === 0) {
      state.tierart = "";
      container.querySelector('[data-feld-input="tierart"]').value = "";
    }
  }
}

function istGueltigeEmail(wert) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wert);
}

function aktualisiereSubmitStatus(hausKey, container) {
  const state = FORM_STATE[hausKey];
  const emailWert = state.email.trim();
  const emailGueltig = istGueltigeEmail(emailWert);
  container.querySelector('[data-feld-input="email"]').classList.toggle(
    "feld-input--ungueltig",
    emailWert.length > 0 && !emailGueltig
  );

  const gueltig =
    state.name.trim().length > 1 &&
    emailGueltig &&
    state.telefonLand.length === 2 &&
    state.telefonNummer.length > 3;
  container.querySelector("[data-submit]").disabled = !gueltig;
}

function zeigeFormular(hausKey, container, von, bis) {
  if (!FORM_STATE[hausKey]) initFormState(hausKey);
  FORM_STATE[hausKey].von = von;
  FORM_STATE[hausKey].bis = bis;
  container.hidden = false;
  renderFormular(hausKey, container);
  container.querySelector("[data-zeitspanne]").textContent =
    `${t("form.range")}: ${formatiereDatum(von)} – ${formatiereDatum(bis)}`;
}

function absenden(hausKey, container) {
  const state = FORM_STATE[hausKey];
  const name = state.name.trim();
  const email = state.email.trim();
  const telefon = `+${state.telefonLand} ${telefonAnzeige(state)}`;
  const honeypot = container.querySelector('input[name="website"]').value;
  if (honeypot) return; // Bot erkannt, still abbrechen

  const zusammenfassung = {
    haus: hausKey,
    name,
    email,
    telefon,
    von: state.von,
    bis: state.bis,
    erwachsene: state.erwachsene,
    kinder: state.kinder,
    tiere: state.tiere,
    tierart: state.tiere > 0 ? state.tierart.trim() : ""
  };

  if (CONFIG.useMockData) {
    // Testmodus: kein echter Mailversand, nur lokale Blockierung + Anzeige.
    TEST_REQUESTS[hausKey].push({ von: state.von, bis: state.bis, status: "ANGEFRAGT" });
  } else {
    // TODO Phase 3: echten POST an CONFIG.haeuser[hausKey].appsScriptUrl senden
    // (Body als text/plain mit JSON-Inhalt, siehe PLAN.md "Technischer Hinweis").
  }

  state.erfolgHtml = `
    <strong>${t("form.success.title")}</strong>
    <p>${t("form.success.body")}</p>
    <p><strong>An:</strong> ${CONFIG.haeuser[hausKey].verwalterEmail || "(noch keine Verwalter-Adresse hinterlegt)"}</p>
    <p><strong>Betreff:</strong> Reservationsanfrage ${CONFIG.haeuser[hausKey].name} – ${name}, ${formatiereDatum(state.von)} – ${formatiereDatum(state.bis)}</p>
    <pre>${JSON.stringify(zusammenfassung, null, 2)}</pre>
  `;
  state.abgeschickt = true;

  const erfolgBox = container.querySelector("[data-erfolg]");
  erfolgBox.hidden = false;
  erfolgBox.innerHTML = state.erfolgHtml;
  container.querySelector("[data-submit]").disabled = true;
  container.querySelectorAll("[data-feld-input]").forEach((el) => (el.disabled = true));
  container.querySelectorAll("[data-aktion]").forEach((el) => (el.disabled = true));

  document.dispatchEvent(new CustomEvent("anfrage-abgeschickt", { detail: { hausKey } }));
}
