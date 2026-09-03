/**
 * Deterministischer Pseudo-Zufall für Demo-Daten (FNV-1a-artiger Hash) —
 * kein Crypto nötig, nur damit dieselbe `key` über mehrere Seed-Läufe hinweg
 * dieselbe "zufällige" Auswahl liefert (Idempotenz). Geteilt zwischen
 * `demo-contacts.ts` (Kontaktfelder) und `seed-loans.ts` (Ausleihhistorie).
 */
function stableHash(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Ganzzahl in `[0, poolSize)`, stabil für `key`. */
export function stableIndex(key: string, poolSize: number): number {
  return stableHash(key) % poolSize;
}

/** Gleitkommazahl in `[0, 1)`, stabil für `key`. */
export function stableFloat(key: string): number {
  return stableHash(key) / 2 ** 32;
}
