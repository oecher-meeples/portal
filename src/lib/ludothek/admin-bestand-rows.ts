import type {
  BoardGameKind,
  LanguageDependence,
  RuleBookLanguage,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  zustandFromHoldingAndUnit,
  type GameZustand,
} from "@/lib/ludothek/holdings";
import {
  buildUnitAndKeeperMaps,
  formatLocationChain,
  walkUnitChain,
} from "@/lib/ludothek/holdings-lookup";
import {
  gameCopyAdminWhere,
  type AdminBestandFilter,
} from "@/lib/ludothek/admin-bestand-filters";
import { formatDatePlain } from "@/lib/utils/format";
import { memberDisplayName } from "@/lib/members/member-display-name";

/** One row per physical `GameCopy` for `/admin/bestand` (#121/#198). */
export type AdminBoardGameRow = {
  /** GameCopy id. */
  id: string;
  /** BoardGame (title) id. */
  boardGameId: string;
  title: string;
  secondaryTitle: string | null;
  ean: string | null;
  status: "ACTIVE" | "MAINTENANCE" | "DEINVENTARISED";
  needsCompletenessCheck: boolean;
  lastCheckedAt: string | null;
  archivedReason: string | null;
  zustand: GameZustand;
  locationChain: string;
  bggId: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  /** BGGs Community-Durchschnittsbewertung (0–10), `null` ohne Bewertungen
   * oder ohne BGG-ID (#214). */
  averageRating: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  condition: string | null;
  /** Freie Inventarnummer des Exemplars (#270). */
  inventoryNumber: string | null;
  kind: BoardGameKind;
  explainerVideoUrl: string | null;
  languageDependence: LanguageDependence | null;
  ruleBookLanguages: RuleBookLanguage[];
  publisher: string[];
  author: string[];
  yearPublished: number | null;
  /** BGG-Alternativnamen, ungefiltert — matcht in der Suche wie der Titel
   * selbst (#187). */
  alternateNames: string[];
};

/**
 * Every row `/admin/bestand` needs — one `GameCopy` per row, its Standort-Kette
 * resolved the same way as everywhere else in the Ludothek (#121). Shared by
 * the page itself and the CSV-Export-Action (#198), which otherwise would
 * duplicate this exact query + mapping.
 */
export async function buildAdminBoardGameRows({
  showDeinventarised = false,
  filter = null,
}: {
  showDeinventarised?: boolean;
  filter?: AdminBestandFilter;
} = {}): Promise<AdminBoardGameRow[]> {
  const [copies, units] = await Promise.all([
    prisma.gameCopy.findMany({
      where: gameCopyAdminWhere({ showDeinventarised, filter }),
      orderBy: { boardGame: { title: "asc" } },
      include: {
        boardGame: { include: { alternateNames: { select: { name: true } } } },
        holdings: {
          where: { endedAt: null },
          include: {
            unit: true,
            vereinsmitglied: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                meeple: { select: { displayName: true, neonAuthUserId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.storageUnit.findMany({
      select: {
        id: true,
        label: true,
        parentUnitId: true,
        keeperMeepleId: true,
      },
    }),
  ]);

  const { unitById, keeperNameById } = await buildUnitAndKeeperMaps(units);

  return copies.map((copy) => {
    const holding = copy.holdings[0] ?? null;
    const zustand = holding
      ? zustandFromHoldingAndUnit(
          holding,
          holding.unit,
          copy.status,
          holding.vereinsmitglied,
        )
      : "nicht-erfasst";
    const boardGame = copy.boardGame;

    return {
      id: copy.id,
      boardGameId: boardGame.id,
      title: boardGame.title,
      secondaryTitle: boardGame.secondaryTitle,
      ean: boardGame.ean,
      status: copy.status,
      needsCompletenessCheck: copy.needsCompletenessCheck,
      lastCheckedAt: copy.lastCheckedAt
        ? formatDatePlain(copy.lastCheckedAt)
        : null,
      archivedReason: copy.archivedReason,
      zustand,
      bggId: boardGame.bggId,
      minPlayers: boardGame.minPlayers,
      maxPlayers: boardGame.maxPlayers,
      playTimeMinutes: boardGame.playTimeMinutes,
      weight: boardGame.weight,
      averageRating: boardGame.averageRating,
      imageUrl: boardGame.imageUrl,
      description: boardGame.description,
      mechanics: boardGame.mechanics,
      condition: copy.condition,
      inventoryNumber: copy.inventoryNumber,
      kind: boardGame.kind,
      explainerVideoUrl: boardGame.explainerVideoUrl,
      languageDependence: boardGame.languageDependence,
      publisher: boardGame.publisher,
      author: boardGame.author,
      yearPublished: boardGame.yearPublished,
      ruleBookLanguages: copy.ruleBookLanguages,
      alternateNames: boardGame.alternateNames.map((a) => a.name),
      locationChain: (() => {
        if (holding?.vereinsmitgliedId) {
          return formatLocationChain({
            responsibleName: holding.vereinsmitglied
              ? memberDisplayName(holding.vereinsmitglied)
              : "Vereinsmitglied",
            unitChain: "",
          });
        }
        if (!holding?.unitId) return "";
        const { unitChain, keeperMeepleId } = walkUnitChain(
          holding.unitId,
          unitById,
        );
        return formatLocationChain({
          responsibleName: keeperMeepleId
            ? (keeperNameById.get(keeperMeepleId) ?? null)
            : null,
          unitChain,
        });
      })(),
    };
  });
}
