import type { NotificationCloseable } from "@/lib/notifications/types";

const STORAGE_PREFIX = "notification-closed:";
/** Eine `temporary`-Notification kommt nach diesem Zeitraum automatisch
 * zurück, unabhängig vom Login-Zustand (#339) — Meeple-Sessions laufen
 * praktisch nie ab, "nächster Login" wäre kein sinnvoller Wiederkehr-
 * Zeitpunkt. */
const TEMPORARY_REOPEN_HOURS = 18;

type ClosedEntry = { value: "permanent" | string };

function storageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

function readEntry(id: string): ClosedEntry | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as ClosedEntry;
  } catch {
    // Private-Mode/blockierter Storage oder kaputtes JSON — dann gilt die
    // Notification als nicht geschlossen (fail open: sichtbar bleiben ist
    // hier die sicherere Fehlrichtung als eine dringende Notification zu
    // verstecken).
    return null;
  }
}

/** True, solange `id` aktuell im Banner unterdrückt bleiben soll — `yes`
 * dauerhaft, `temporary` bis `TEMPORARY_REOPEN_HOURS` nach dem Schließen. */
export function isNotificationClosed(
  id: string,
  now: Date = new Date(),
): boolean {
  const entry = readEntry(id);
  if (!entry) return false;
  if (entry.value === "permanent") return true;

  const closedAt = new Date(entry.value);
  if (Number.isNaN(closedAt.getTime())) return false;
  const reopenAt = new Date(
    closedAt.getTime() + TEMPORARY_REOPEN_HOURS * 60 * 60 * 1000,
  );
  return now < reopenAt;
}

/** Schreibt einen Schließen-Eintrag für `id` — `no` ist hier nie gültig
 * (der Aufrufer zeigt für `no` gar keinen Schließen-Button an). */
export function closeNotification(
  id: string,
  closeable: Exclude<NotificationCloseable, "no">,
) {
  try {
    const value = closeable === "yes" ? "permanent" : new Date().toISOString();
    localStorage.setItem(storageKey(id), JSON.stringify({ value }));
  } catch {
    // Persistiert dann halt nicht — bleibt für die aktuelle Seitenansicht
    // trotzdem geschlossen (State lebt zusätzlich im Banner selbst).
  }
}

/**
 * Räumt Schließen-Einträge auf, deren Notification-Id nicht mehr in
 * `currentIds` vorkommt (#339) — z. B. weil die Notification zwischenzeitlich
 * gelöscht/deaktiviert wurde. Läuft beim Schreiben eines neuen Eintrags.
 */
export function pruneStaleClosedEntries(currentIds: readonly string[]) {
  try {
    const currentSet = new Set(currentIds);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const id = key.slice(STORAGE_PREFIX.length);
      if (!currentSet.has(id)) localStorage.removeItem(key);
    }
  } catch {
    // s.o. — Aufräumen ist best-effort, kein Fehlerfall fürs Rendern.
  }
}
