// Einfacher Zugangscode-Schutz für die Seite, solange sie noch nicht
// öffentlich launcht. Bewusst nur ein "Hinweis-Passwort", keine echte
// Sicherheit: die Seite ist statisch (GitHub Pages, kein Server), der Code
// liegt also für jeden im Quelltext sichtbar. Hält zufällige Besucher fern,
// nicht jemanden, der gezielt nachschaut.
//
// Die eigentliche Sperre (Seiteninhalt ausblenden, bevor überhaupt etwas
// gerendert wird) passiert per Inline-Script/-Style im <head> von
// index.html — dieses Script hier baut nur die Eingabe-Box und schaltet
// bei richtigem Code wieder frei.
//
// bestaetigen.html bindet dieses Script bewusst NICHT ein: die Zusagen-/
// Ablehnen-Links aus den Verwalter-Mails müssen ohne Zugangscode
// funktionieren, sonst kommt der Verwalter selbst nicht mehr an seine
// eigenen Buchungsanfragen.
const ZUGANGSCODE = "18071931";
const ZUGANG_SPEICHER_KEY = "ferienwohnungen-zugang";

function zugangGespeichert() {
  try {
    return localStorage.getItem(ZUGANG_SPEICHER_KEY) === "ok";
  } catch (err) {
    return false;
  }
}

function zugangSpeichern() {
  try {
    localStorage.setItem(ZUGANG_SPEICHER_KEY, "ok");
  } catch (err) {
    // localStorage nicht verfügbar (z. B. manche privaten Browserfenster) —
    // Zugang gilt dann nur für die aktuelle Seitenansicht, nicht dauerhaft.
  }
}

function zugangUeberlagerungZeigen() {
  const overlay = document.createElement("div");
  overlay.className = "zugang-overlay";
  overlay.innerHTML = `
    <form class="zugang-box">
      <p class="zugang-titel">Zugangscode</p>
      <input type="password" inputmode="numeric" class="feld-input" autocomplete="off" data-zugang-eingabe>
      <button type="submit" class="anfrage-submit">Bestätigen</button>
      <p class="zugang-fehler" data-zugang-fehler hidden>Falscher Code, bitte nochmal versuchen.</p>
    </form>
  `;
  document.body.appendChild(overlay);

  const eingabe = overlay.querySelector("[data-zugang-eingabe]");
  eingabe.focus();

  overlay.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (eingabe.value.trim() === ZUGANGSCODE) {
      zugangSpeichern();
      document.documentElement.classList.remove("zugang-gesperrt");
      overlay.remove();
    } else {
      overlay.querySelector("[data-zugang-fehler]").hidden = false;
      eingabe.value = "";
      eingabe.focus();
    }
  });
}

if (!zugangGespeichert()) {
  zugangUeberlagerungZeigen();
}
