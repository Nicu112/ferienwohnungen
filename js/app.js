const HAEUSER = Object.keys(CONFIG.haeuser);

function init() {
  initTabs();

  HAEUSER.forEach((hausKey) => {
    initHausState(hausKey);
    initFormState(hausKey);
    const standortContainer = document.querySelector(`[data-standort="${hausKey}"]`);
    renderStandort(hausKey, standortContainer);
    const karussellContainer = document.querySelector(`[data-karussell="${hausKey}"]`);
    renderKarussell(hausKey, karussellContainer);
    const beschreibungContainer = document.querySelector(`[data-beschreibung="${hausKey}"]`);
    renderBeschreibung(hausKey, beschreibungContainer);
    const kalenderContainer = document.querySelector(`[data-kalender="${hausKey}"]`);
    renderKalender(hausKey, kalenderContainer);
  });

  document.addEventListener("zeitspanne-gewaehlt", (e) => {
    const { hausKey, von, bis } = e.detail;
    const anfrageContainer = document.querySelector(`[data-anfrage="${hausKey}"]`);
    zeigeFormular(hausKey, anfrageContainer, von, bis);
  });

  // Bewusst kein "zeitspanne-zurueckgesetzt"-Handler mehr: solange der Gast
  // nur den ersten Klick einer neuen Zeitspanne setzt (Ankunftstag), bleibt
  // das bereits sichtbare Formular mit allen eingegebenen Daten unverändert
  // stehen, bis der zweite Klick (Abreisetag) die Zeitspanne aktualisiert.

  document.addEventListener("anfrage-abgeschickt", (e) => {
    const { hausKey } = e.detail;
    const kalenderContainer = document.querySelector(`[data-kalender="${hausKey}"]`);
    HAUS_STATE[hausKey].start = null;
    HAUS_STATE[hausKey].ende = null;
    renderKalender(hausKey, kalenderContainer);
  });

  document.addEventListener("sprache-geaendert", () => {
    HAEUSER.forEach((hausKey) => {
      const karussellContainer = document.querySelector(`[data-karussell="${hausKey}"]`);
      renderKarussell(hausKey, karussellContainer); // Index bleibt erhalten, nur Beschriftungen ändern sich
      const beschreibungContainer = document.querySelector(`[data-beschreibung="${hausKey}"]`);
      renderBeschreibung(hausKey, beschreibungContainer);
      const kalenderContainer = document.querySelector(`[data-kalender="${hausKey}"]`);
      renderKalender(hausKey, kalenderContainer);
      const anfrageContainer = document.querySelector(`[data-anfrage="${hausKey}"]`);
      if (!anfrageContainer.hidden && anfrageContainer.innerHTML) {
        renderFormular(hausKey, anfrageContainer);
      }
    });
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".haus-panel");

  // Echte Hausnamen sind Eigennamen und werden nicht übersetzt (anders als
  // die übrige Oberfläche), deshalb direkt aus CONFIG statt via data-i18n.
  tabButtons.forEach((btn) => {
    const hausKey = btn.getAttribute("data-tab");
    btn.textContent = CONFIG.haeuser[hausKey].name;
    // "aktiv: false" blendet ein Haus komplett aus der Navigation aus (Code/
    // Config bleiben unverändert, jederzeit mit "aktiv: true" reaktivierbar).
    if (CONFIG.haeuser[hausKey].aktiv === false) btn.hidden = true;
  });

  const aktiveTabs = [...tabButtons].filter((btn) => !btn.hidden);
  // Eine Tab-Leiste mit nur einem sichtbaren Button hätte keine Funktion.
  if (aktiveTabs.length <= 1) {
    document.querySelector(".tabs").hidden = true;
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const ziel = btn.getAttribute("data-tab");
      tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((p) => (p.hidden = p.getAttribute("data-haus") !== ziel));
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
