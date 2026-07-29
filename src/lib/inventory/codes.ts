import { StorageUnitKind } from "@prisma/client";

/** The fixed unit for games whose physical location has never been recorded. */
export const UNSORTIERT_CODE = "OM-BOX-0000";

const PREFIXES: Record<StorageUnitKind, string> = {
  BOX: "OM-BOX-",
  SHELF: "OM-SHELF-",
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

export type ScannedCode =
  | { kind: "unit"; value: string }
  | { kind: "ean"; value: string }
  | { kind: "unknown"; value: string };

/** Distinguishes a unit label (`OM-BOX-0001`) from an EAN-8/13 barcode. */
export function parseScannedCode(raw: string): ScannedCode {
  const value = raw.trim();

  if (/^(OM-BOX-|OM-SHELF-)[A-Z0-9]+$/i.test(value)) {
    return { kind: "unit", value: value.toUpperCase() };
  }

  const digitsOnly = value.replace(/[\s-]/g, "");
  if (/^\d{8}$/.test(digitsOnly) || /^\d{13}$/.test(digitsOnly)) {
    return { kind: "ean", value: digitsOnly };
  }

  return { kind: "unknown", value };
}
