import type { StorageUnitKind } from "@prisma/client";
import {
  isValidInventoryNumber,
  parseInventoryNumber,
} from "@/lib/ludothek/game-copy-inventory-number";

/**
 * QR-Short-IDs (Epic #542): jeder gedruckte Code kodiert
 * `https://short.oecher-meeples.org/id/<präfix>-<id>`. Die Short-Domain leitet
 * extern auf `<app>/id/<slug>` weiter; `resolveShortId()` entscheidet dort,
 * wohin es geht. Reine Logik, client-sicher (Scanner, Etiketten-Export).
 */

/** Fest, nicht per Env konfigurierbar — ein lokal gedruckter Test-Code ist
 * damit identisch mit einem echten. Lokal aufgelöst wird über den Pfad,
 * siehe `parseShortId()`. */
export const SHORT_ID_BASE_URL = "https://short.oecher-meeples.org";

/** Präfix-Registry — neue Typen hier ergänzen. `meeple` ist registriert,
 * das Routing folgt in #541. */
export const SHORT_ID_KINDS = ["inv", "box", "shelf", "meeple"] as const;
export type ShortIdKind = (typeof SHORT_ID_KINDS)[number];

export type ShortId =
  /** Exemplar per Inventarnummer (`inv-123`). */
  | { kind: "inv"; id: number }
  /** Aufbewahrungseinheit; `id` ist der Teil hinter `OM-BOX-`/`OM-SHELF-`
   * in Großbuchstaben (`box-0001` ↔ `OM-BOX-0001`, `shelf-C4` ↔
   * `OM-SHELF-C4`) — führende Nullen bleiben erhalten, frei vergebene Codes
   * (vorgedruckte Etiketten) sind alphanumerisch. */
  | { kind: "box" | "shelf"; id: string }
  | { kind: "meeple"; id: string };

export type UnitShortId = Extract<ShortId, { kind: "box" | "shelf" }>;

const UNIT_KIND_BY_PREFIX = {
  box: "BOX",
  shelf: "SHELF",
} as const satisfies Record<UnitShortId["kind"], StorageUnitKind>;

const SLUG_PATTERN = /^([a-z]+)-(.+)$/i;
const UNIT_ID_PATTERN = /^[A-Z0-9]+$/i;
const UNIT_CODE_PATTERN = /^OM-(BOX|SHELF)-([A-Z0-9]+)$/i;

/** `inv-123`, `box-0001` — der Teil hinter `/id/`. */
export function formatShortIdSlug(shortId: ShortId): string {
  return `${shortId.kind}-${shortId.id}`;
}

/** Pfad der Detailseite mit vorausgewähltem Exemplar (#548) — auch das
 * Scanner-Serien-Log verlinkt darauf (Korrektur per Gegenbuchung, #538). */
export function copyDetailPath(boardGameSlug: string, inventoryNumber: number) {
  return `/ludothek/${boardGameSlug}/${formatShortIdSlug({ kind: "inv", id: inventoryNumber })}`;
}

/** Anlegen-Formular für ein gescanntes, noch unbekanntes Einheiten-Etikett
 * (#549) — Ziel des Routers und des Einzel-Scans. */
export function unitCreatePath(shortId: UnitShortId): string {
  return `/admin/einheiten?neu=${formatShortIdSlug(shortId)}`;
}

/** In-App-Pfad des Routers (`/id/[slug]`) — wer einen gescannten Code
 * auflösen will, navigiert hierhin statt die Regeln aus `resolveShortId()`
 * nachzubauen. */
export function shortIdRouterPath(shortId: ShortId): string {
  return `/id/${formatShortIdSlug(shortId)}`;
}

/** Was ein Scan in einem Suchfeld auslöst (#570): Short-ID → Router,
 * `meeple-` → noch nicht unterstützt (#541), alles andere (EAN, Freitext) →
 * Suchtext. */
export type ScannedSearchInput =
  | { kind: "navigate"; href: string }
  | { kind: "unsupported"; shortId: ShortId }
  | { kind: "search"; text: string };

export function classifyScannedSearch(raw: string): ScannedSearchInput {
  const shortId = parseShortId(raw);
  if (!shortId) return { kind: "search", text: raw };
  if (shortId.kind === "meeple") return { kind: "unsupported", shortId };
  return { kind: "navigate", href: shortIdRouterPath(shortId) };
}

export function buildShortIdUrl(shortId: ShortId): string {
  return `${SHORT_ID_BASE_URL}/id/${formatShortIdSlug(shortId)}`;
}

/** Nimmt einen reinen Slug oder eine beliebige URL. Bei einer URL zählt nur
 * der Pfadabschnitt nach `/id/` — der Host wird ignoriert, damit eine lokale
 * Umgebung echte Codes auflöst. */
function extractSlug(raw: string): string | null {
  const value = raw.trim();
  if (!value.includes("/")) return value || null;

  const match = /\/id\/([^/?#]+)/.exec(value);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function isShortIdKind(value: string): value is ShortIdKind {
  return (SHORT_ID_KINDS as readonly string[]).includes(value);
}

/** Slug oder URL → `ShortId`; `null` bei unbekanntem Präfix oder ungültiger
 * ID. Präfixe sind case-insensitive. */
export function parseShortId(raw: string): ShortId | null {
  const slug = extractSlug(raw);
  const match = slug ? SLUG_PATTERN.exec(slug) : null;
  if (!match) return null;

  const kind = match[1].toLowerCase();
  const id = match[2];
  if (!isShortIdKind(kind)) return null;

  switch (kind) {
    case "inv": {
      const inventoryNumber = parseInventoryNumber(id);
      return inventoryNumber !== null && isValidInventoryNumber(inventoryNumber)
        ? { kind, id: inventoryNumber }
        : null;
    }
    case "box":
    case "shelf":
      return UNIT_ID_PATTERN.test(id) ? { kind, id: id.toUpperCase() } : null;
    case "meeple":
      return /^[A-Za-z0-9_-]+$/.test(id) ? { kind, id } : null;
  }
}

/** `box-0001` → `OM-BOX-0001` (Format aus `lib/inventory/codes.ts`). */
export function unitCodeFromShortId(shortId: UnitShortId): string {
  return `OM-${UNIT_KIND_BY_PREFIX[shortId.kind]}-${shortId.id}`;
}

/** `OM-BOX-0001` → `box-0001`; `null` für Codes ohne Short-ID (z. B.
 * `OM-EVENT-…`, die nie als Etikett gedruckt werden). */
export function shortIdFromUnitCode(code: string): UnitShortId | null {
  const match = UNIT_CODE_PATTERN.exec(code.trim());
  if (!match) return null;
  const kind = match[1].toUpperCase() === "BOX" ? "box" : "shelf";
  return { kind, id: match[2].toUpperCase() };
}

export function unitKindFromShortId(shortId: UnitShortId): StorageUnitKind {
  return UNIT_KIND_BY_PREFIX[shortId.kind];
}
