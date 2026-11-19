import { prisma } from "@/lib/utils/prisma";
import {
  formatShortIdSlug,
  parseShortId,
  unitCodeFromShortId,
  type ShortId,
  type UnitShortId,
} from "@/lib/short-id/short-id";

export type ShortIdViewer = {
  /** `games:manage` in der aktuellen Ansicht — darf Unbekanntes anlegen. */
  canManageGames: boolean;
};

export type ShortIdResolution =
  { kind: "redirect"; href: string } | { kind: "not-found" };

const NOT_FOUND: ShortIdResolution = { kind: "not-found" };

function redirectTo(href: string): ShortIdResolution {
  return { kind: "redirect", href };
}

/** Exemplar: bekannt → Detailseite mit Vorauswahl; unbekannt → Anlegen
 * (mit Recht) oder Ludothek-Suche nach der Nummer (ohne). Ein
 * deinventarisiertes Exemplar gilt als bekannt — seine Nummer ist vergeben,
 * ein „Neu anlegen" würde an der Eindeutigkeit scheitern. */
async function resolveInventoryNumber(
  shortId: Extract<ShortId, { kind: "inv" }>,
  viewer: ShortIdViewer,
): Promise<ShortIdResolution> {
  const copy = await prisma.gameCopy.findUnique({
    where: { inventoryNumber: shortId.id },
    select: { boardGame: { select: { slug: true } } },
  });
  if (copy) {
    return redirectTo(
      `/ludothek/${copy.boardGame.slug}/${formatShortIdSlug(shortId)}`,
    );
  }
  return redirectTo(
    viewer.canManageGames
      ? `/ludothek?neu=${formatShortIdSlug(shortId)}`
      : `/ludothek?q=${shortId.id}`,
  );
}

/** Einheit: bekannt → Ludothek nach Einheit gefiltert (für alle, auch
 * Gäste); unbekannt → Anlegen (mit Recht) oder 404 — die Ludothek-Suche
 * findet keine Einheiten-Codes, ein Such-Fallback brächte nichts. Eine
 * ausgemusterte Einheit (`retiredAt`) gilt als bekannt: ihr Code wird nie
 * wiederverwendet (`nextUnitCode`). */
async function resolveUnit(
  shortId: UnitShortId,
  viewer: ShortIdViewer,
): Promise<ShortIdResolution> {
  const slug = formatShortIdSlug(shortId);
  const unit = await prisma.storageUnit.findUnique({
    where: { code: unitCodeFromShortId(shortId) },
    select: { id: true },
  });
  if (unit) return redirectTo(`/ludothek?einheit=${slug}`);
  return viewer.canManageGames
    ? redirectTo(`/admin/einheiten?neu=${slug}`)
    : NOT_FOUND;
}

/**
 * Ziel des Routers `/id/[slug]` (#544/#545) — Slug oder vollständige URL
 * rein, Redirect-Ziel oder „nicht gefunden" raus. Funktioniert ohne Login:
 * die Codes kleben auf Spielekartons, die Event-Gäste scannen.
 */
export async function resolveShortId(
  raw: string,
  viewer: ShortIdViewer,
): Promise<ShortIdResolution> {
  const shortId = parseShortId(raw);
  if (!shortId) return NOT_FOUND;

  switch (shortId.kind) {
    case "inv":
      return resolveInventoryNumber(shortId, viewer);
    case "box":
    case "shelf":
      return resolveUnit(shortId, viewer);
    case "meeple":
      // Routing folgt in #541.
      return NOT_FOUND;
  }
}
