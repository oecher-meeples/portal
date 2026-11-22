"use client";

import { useLocalStorageState } from "@/components/ui/use-local-storage-state";
import {
  addScanLogEntry,
  pruneScanLog,
  scanLogStorageKey,
  type ScanLogEntry,
  type ScanLogPolicy,
} from "@/lib/ludothek/scan-log";

function newEntryKey() {
  // Kein `crypto.randomUUID()`: das gibt es nur im Secure Context, das
  // LAN-Dev-Setup läuft aber teils über http.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Persistentes Scan-Log eines Modus (#574), ein `localStorage`-Schlüssel pro
 * Modus. Abgelaufene Einträge fallen beim Laden weg, neue Einträge kommen
 * oben dazu und werden auf `policy.max` gekürzt. Gemeinsam genutzt von
 * `useScanSeries` (alle Serienmodi) und dem Einzel-Scan.
 */
export function useScanLog<E extends ScanLogEntry>(
  mode: string,
  policy: ScanLogPolicy,
  dedupeBy?: (entry: E) => string,
) {
  const [entries, setEntries] = useLocalStorageState<E[]>(
    scanLogStorageKey(mode),
    [],
    (stored) => pruneScanLog<E>(stored, policy, Date.now()),
  );

  function add(entry: Omit<E, keyof ScanLogEntry>) {
    const full = { ...entry, key: newEntryKey(), at: Date.now() } as E;
    setEntries((current) => addScanLogEntry(current, full, policy, dedupeBy));
  }

  return { entries, add };
}
