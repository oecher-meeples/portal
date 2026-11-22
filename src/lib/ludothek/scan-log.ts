/**
 * Persistente Scan-Logs der Scanner-Seite (#574). Das hier ist die reine
 * Logik: kürzen, abgelaufene Einträge entfernen, Duplikate nach oben
 * schieben. Gespeichert wird im `localStorage` des Geräts, gelöscht beim
 * Abmelden (`useSignOut` → `localStorage.clear()`).
 */

export type ScanLogPolicy = {
  /** Höchstzahl der Einträge, neueste zuerst. */
  max: number;
  /** Älter als das wird beim Laden verworfen. */
  maxAgeMs: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** „Zuletzt gescannt" im Einzel-Scan: 25 Einträge, 24 h. */
export const SINGLE_SCAN_LOG_POLICY: ScanLogPolicy = {
  max: 25,
  maxAgeMs: 24 * HOUR_MS,
};

/** Serien-Log je Modus: 50 Einträge, 3 Monate. */
export const SERIES_SCAN_LOG_POLICY: ScanLogPolicy = {
  max: 50,
  maxAgeMs: 90 * DAY_MS,
};

/** Präfix aller Scan-Log-Schlüssel, einer pro Modus. */
export const SCAN_LOG_STORAGE_PREFIX = "scan-log:";

export function scanLogStorageKey(mode: string): string {
  return `${SCAN_LOG_STORAGE_PREFIX}${mode}`;
}

/** Jeder Eintrag trägt eine eindeutige `key` und seinen Zeitstempel `at`. */
export type ScanLogEntry = { key: string; at: number };

/**
 * Neuer Eintrag oben. Mit `dedupeBy` ersetzt er einen älteren Eintrag mit
 * gleichem Wert, statt ihn zu verdoppeln. Dadurch rutscht ein erneut
 * gescannter Code mit neuem Zeitstempel nach oben.
 */
export function addScanLogEntry<E extends ScanLogEntry>(
  entries: E[],
  entry: E,
  policy: ScanLogPolicy,
  dedupeBy?: (entry: E) => string,
): E[] {
  const rest = dedupeBy
    ? entries.filter((existing) => dedupeBy(existing) !== dedupeBy(entry))
    : entries;
  return [entry, ...rest].slice(0, policy.max);
}

/**
 * Gespeicherten Wert prüfen und abgelaufene Einträge entfernen (beim
 * Seitenaufruf). Ein Wert, der keine Liste ist, gilt als leer. Das betrifft
 * auch fremde oder kaputte Daten im Storage.
 */
export function pruneScanLog<E extends ScanLogEntry>(
  stored: unknown,
  policy: ScanLogPolicy,
  now: number,
): E[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (entry): entry is E =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ScanLogEntry).key === "string" &&
        typeof (entry as ScanLogEntry).at === "number" &&
        now - (entry as ScanLogEntry).at <= policy.maxAgeMs,
    )
    .slice(0, policy.max);
}
