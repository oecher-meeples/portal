import { StorageUnitKind } from "@prisma/client";
import {
  parseShortId,
  unitCodeFromShortId,
  type ShortId,
} from "@/lib/short-id/short-id";

/** The fixed unit for games whose physical location has never been recorded. */
export const UNSORTIERT_CODE = "OM-BOX-0000";

const PREFIXES: Record<StorageUnitKind, string> = {
  BOX: "OM-BOX-",
  SHELF: "OM-SHELF-",
  /** Nie von `nextUnitCode()` genutzt — Event-Codes sind deterministisch aus
   * dem Event-Slug abgeleitet (`OM-EVENT-{slug}`, siehe `ensureEventUnit()`),
   * nicht fortlaufend. Der Eintrag existiert nur, weil `PREFIXES` als
   * `Record<StorageUnitKind, string>` für jeden Kind einen Wert verlangt. */
  EVENT: "OM-EVENT-",
};

const CODE_PATTERN = /^(OM-BOX-|OM-SHELF-)(\d+)$/;

/**
 * Next free code for the given kind, filling gaps left by retired units instead
 * of only ever appending. `existingCodes` should contain every code of that kind,
 * including retired ones — codes are never reused once assigned.
 */
export function nextUnitCode(kind: StorageUnitKind, existingCodes: string[]) {
  const prefix = PREFIXES[kind];
  const usedNumbers = new Set(
    existingCodes
      .map((code) => {
        const match = CODE_PATTERN.exec(code);
        return match && code.startsWith(prefix) ? Number(match[2]) : null;
      })
      .filter((n): n is number => n !== null),
  );

  let next = 1;
  while (usedNumbers.has(next)) {
    next += 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}

/** Prefix for a Meeple's personal QR-Code (#465) — statisch an die
 * Meeple-Id gebunden, keine Rotation/kein Ablauf (bewusste Entscheidung,
 * siehe Issue). Eigene Familie neben `OM-BOX-`/`OM-SHELF-`/`OM-EVENT-`. */
export const MEEPLE_CODE_PREFIX = "OM-MEEPLE-";

/** Builds the QR content for a Meeple's personal code (#465). */
export function buildMeepleCode(meepleId: string): string {
  return `${MEEPLE_CODE_PREFIX}${meepleId}`;
}

export type ScannedCode =
  /** Exemplar-Etikett (`…/id/inv-<n>`, #547) — identifiziert genau ein
   * Exemplar, anders als die titelbezogene EAN. */
  | { kind: "copy"; inventoryNumber: number }
  | { kind: "unit"; value: string }
  | { kind: "ean"; value: string }
  | { kind: "meeple"; value: string }
  | { kind: "unknown"; value: string };

function fromShortId(shortId: ShortId): ScannedCode {
  switch (shortId.kind) {
    case "inv":
      return { kind: "copy", inventoryNumber: shortId.id };
    case "box":
    case "shelf":
      return { kind: "unit", value: unitCodeFromShortId(shortId) };
    case "meeple":
      return { kind: "meeple", value: shortId.id };
  }
}

/** Distinguishes a QR short ID (`…/id/inv-123`, `…/id/box-0001`, Epic #542 —
 * any host, so a local build resolves real labels), a typed unit code as
 * printed under its QR (`OM-BOX-0001`), a Meeple's personal QR-Code
 * (`OM-MEEPLE-<id>`, #465, until #541) and an EAN-8/13 barcode. */
export function parseScannedCode(raw: string): ScannedCode {
  const value = raw.trim();

  const shortId = parseShortId(value);
  if (shortId) return fromShortId(shortId);

  if (/^(OM-BOX-|OM-SHELF-)[A-Z0-9]+$/i.test(value)) {
    return { kind: "unit", value: value.toUpperCase() };
  }

  if (value.startsWith(MEEPLE_CODE_PREFIX)) {
    return { kind: "meeple", value: value.slice(MEEPLE_CODE_PREFIX.length) };
  }

  const digitsOnly = value.replace(/[\s-]/g, "");
  if (/^\d{8}$/.test(digitsOnly) || /^\d{13}$/.test(digitsOnly)) {
    return { kind: "ean", value: digitsOnly };
  }

  return { kind: "unknown", value };
}

/** Typed or scanned unit input → stored unit code: a short-ID label resolves
 * to its code (`…/id/box-0001` → `OM-BOX-0001`), anything else is taken as
 * a (possibly new, freely chosen) code in upper case. */
export function normalizeUnitCode(raw: string): string {
  const parsed = parseScannedCode(raw);
  return parsed.kind === "unit" ? parsed.value : raw.trim().toUpperCase();
}
