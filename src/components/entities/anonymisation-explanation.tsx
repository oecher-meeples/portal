/** Erklärtext für den dreistufigen Anonymisierungs-Prozess (#453) —
 * gemeinsam genutzt von den "Bereit zur Anonymisierung" (Stufe 2) und
 * "Bereit zur endgültigen Löschung" (Stufe 3) Karten in
 * admin-mitglieder-view.tsx, damit der Text nicht dupliziert wird. Fachlogik
 * der drei Stufen: lib/members/anonymisation.ts (Klassenkommentar), #331. */
export function AnonymisationExplanation() {
  return (
    <>
      <p>
        Wenn ein Mitglied austritt, dürfen wir seine personenbezogenen Daten
        nicht unbegrenzt aufbewahren (Datenschutz-Grundverordnung). Gleichzeitig
        soll die Vereinshistorie — wer wann welches Spiel ausgeliehen hat,
        welche Beiträge geschrieben wurden — nachvollziehbar bleiben.
        Anonymisierung löst diesen Konflikt: personenbezogene Daten werden
        entfernt, die Historie bleibt anonym erhalten (z. B. als &quot;Anonymer
        Meeple&quot;).
      </p>
      <p>Der Prozess läuft in drei Stufen, je nach Zeitpunkt und Anlass:</p>
      <div>
        <p className="font-medium">Stufe 1 — Sofort möglich, jederzeit</p>
        <p className="text-muted-foreground">
          Optionale, freiwillig hinterlegte Angaben werden gelöscht:
          BGG-/BGA-Nutzername, Telegram/Signal/Discord-Handle, Adresse,
          Klingelschild-Hinweis, Marktplatz-Bilder sowie der Autorenname bei
          Blog-Beiträgen. Das Mitglied heißt danach wie das anonyme Sammelkonto.
          Diese Stufe braucht keinen Austritt.
        </p>
      </div>
      <div>
        <p className="font-medium">
          Stufe 2 — Nach Austritt, ohne offene Ausleihen
        </p>
        <p className="text-muted-foreground">
          Setzt Stufe 1 voraus (wird automatisch mitgemacht) und geht weiter:
          Der Zugang (Login) wird endgültig gelöscht, die Verknüpfung zum
          Vereinsmitglieds-Datensatz wird getrennt. Voraussetzung: Das Mitglied
          ist ausgetreten und hat keine Vereinsspiele oder -einheiten mehr
          offen.{" "}
          <strong>
            Das ist der Schritt hinter dem &quot;Anonymisieren&quot;-Button —
            nicht rückgängig zu machen.
          </strong>{" "}
          Login und persönliche Angaben sind danach unwiederbringlich weg.
        </p>
      </div>
      <div>
        <p className="font-medium">
          Stufe 3 — Frühestens 12 Monate nach Austritt
        </p>
        <p className="text-muted-foreground">
          Löscht den verbleibenden Mitgliedschafts-Datensatz vollständig. Auch
          das nur, wenn keine offenen Ausleihen mehr bestehen. Die reine
          Ausleihhistorie bleibt für die Statistik erhalten, aber ohne jeden
          Bezug zur Person.
        </p>
      </div>
      <p>
        Die 12-monatige Wartezeit vor Stufe 3 lässt genug Zeit für Rückfragen zu
        vergangenen Ausleihen oder Beitragszahlungen, bevor der Datensatz
        endgültig verschwindet.
      </p>
    </>
  );
}
