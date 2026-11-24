import {
  VERSION_DISPLAY_SELECT,
  versionDisplay,
} from "@/lib/ludothek/taxonomy/contributors-read";
import {
  BOARD_GAME_DISPLAY_SELECT,
  boardGameDisplayFields,
} from "@/lib/ludothek/board-game-display";
import type {
  BoardGameKind,
  BoardGameTrait,
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
import {
  toGameCopyAcquisition,
  type GameCopyAcquisition,
} from "@/lib/ludothek/game-copy-acquisition-read";
import { memberDisplayName } from "@/lib/members/member-display-name";
import {
  meepleEmail,
  toContactDialogMeeple,
  type ContactDialogMeeple,
} from "@/lib/members/contact";

/** One row per physical `GameCopy` for `/admin/bestand` (#121/#198). */
export type AdminBoardGameRow = GameCopyAcquisition & {
  /** GameCopy id. */
  id: string;
  /** BoardGame (title) id. */
  boardGameId: string;
  /** Für den Link zur Titel-Detailseite (`/ludothek/[slug]`). */
  boardGameSlug: string;
  title: string;
  secondaryTitle: string | null;
  ean: string | null;
  status: "ACTIVE" | "MAINTENANCE" | "DEINVENTARISED";
  needsCompletenessCheck: boolean;
  lastCheckedAt: string | null;
  archivedReason: string | null;
  zustand: GameZustand;
  /** Offene Weitergabe/Ausleihe, die die empfangende Person noch nicht
   * bestätigt hat (#406) — analog der "unbestätigt"-`StatusPill` in
   * `GameHoldingPanel`. */
  isUnconfirmed: boolean;
  /** Vorformatierte Kette (`bei X → Y`) — nur noch für den CSV-Export
   * (`admin-bestand-csv-export-dialog.tsx`), der reinen Text statt
   * `ContactDialog` braucht. Die Tabellenzelle selbst nutzt stattdessen
   * `responsibleName`/`unitChain`/`responsibleContactMeeple` einzeln (analog
   * `GameCopyRow`/`LocationChainCell`, #121). */
  locationChain: string;
  /** Verantwortliche Person (Standort-Keeper oder direkt haltendes
   * Vereinsmitglied) — `null` ohne Standort/Person. */
  responsibleName: string | null;
  /** Nur die Lagerort-Kette, ohne die Person davor (siehe `unitChain` in
   * `GameCopyRow`). Leer, wenn ein Vereinsmitglied das Exemplar direkt hält
   * (kein Lagerort dazwischen). */
  unitChain: string;
  /** `null` ohne verantwortliche Person oder ohne deren Meeple-Konto (z. B.
   * MiniMeeple ohne Login) — `LocationChainCell` zeigt dann nur den
   * Klartext-Namen ohne `ContactDialog`. */
  responsibleContactMeeple: ContactDialogMeeple | null;
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
  categories: string[];
  condition: string | null;
  /** Inventarnummer des Exemplars (#270, ganzzahlig seit #543). */
  inventoryNumber: number | null;
  versionId: string | null;
  kind: BoardGameKind;
  explainerVideoUrl: string | null;
  languageDependence: LanguageDependence | null;
  ruleBookLanguages: RuleBookLanguage[];
  publisher: string[];
  author: string[];
  illustrator: string[];
  yearPublished: number | null;
  editionLanguages: string[];
  /** BGG-Alternativnamen, ungefiltert — matcht in der Suche wie der Titel
   * selbst (#187). */
  alternateNames: string[];
  /** BGGs Family-Signale mit Verleih-Auswirkung (#487-Konzept). */
  traits: BoardGameTrait[];
  /** Freier Admin-Hinweis je Titel (#487-Konzept). */
  notes: string | null;
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
        version: VERSION_DISPLAY_SELECT,
        boardGame: BOARD_GAME_DISPLAY_SELECT,
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
                meeple: {
                  select: { id: true, displayName: true, neonAuthUserId: true },
                },
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

  // Erster Durchlauf: Standort/Person pro Exemplar auflösen (rein lokal,
  // keine weitere Query) — liefert je Exemplar auch die Meeple-Id, für die
  // `ContactDialog` gleich Kontaktdaten braucht. Getrennt vom zweiten
  // Durchlauf, damit die dafür nötigen Meeple-Kontaktdaten in genau einer
  // gebündelten Query statt einer pro Zeile geladen werden.
  const resolved = copies.map((copy) => {
    const holding = copy.holdings[0] ?? null;
    if (holding?.vereinsmitgliedId) {
      return {
        copy,
        holding,
        responsibleName: holding.vereinsmitglied
          ? memberDisplayName(holding.vereinsmitglied)
          : "Vereinsmitglied",
        unitChain: "",
        contactMeepleId: holding.vereinsmitglied?.meeple?.id ?? null,
      };
    }
    if (!holding?.unitId) {
      return {
        copy,
        holding,
        responsibleName: null,
        unitChain: "",
        contactMeepleId: null,
      };
    }
    const { unitChain, keeperMeepleId } = walkUnitChain(
      holding.unitId,
      unitById,
    );
    return {
      copy,
      holding,
      responsibleName: keeperMeepleId
        ? (keeperNameById.get(keeperMeepleId) ?? null)
        : null,
      unitChain,
      contactMeepleId: keeperMeepleId,
    };
  });

  const contactMeepleIds = [
    ...new Set(
      resolved
        .map((r) => r.contactMeepleId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const contactMeeples = contactMeepleIds.length
    ? await prisma.meeple.findMany({
        where: { id: { in: contactMeepleIds } },
        select: {
          id: true,
          telegramHandle: true,
          signalHandle: true,
          discordHandle: true,
          address: true,
          shareAddress: true,
          profilePictureUrl: true,
          profilePictureVisibility: true,
          member: { select: { email: true, slug: true } },
        },
      })
    : [];
  const contactMeepleById = new Map(
    contactMeeples.map((m) => [
      m.id,
      toContactDialogMeeple(
        { ...m, email: meepleEmail(m) },
        { kind: "meeple" },
      ),
    ]),
  );

  return resolved.map(
    ({ copy, holding, responsibleName, unitChain, contactMeepleId }) => {
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
        ...boardGameDisplayFields(boardGame),
        status: copy.status,
        needsCompletenessCheck: copy.needsCompletenessCheck,
        lastCheckedAt: copy.lastCheckedAt
          ? formatDatePlain(copy.lastCheckedAt)
          : null,
        archivedReason: copy.archivedReason,
        zustand,
        isUnconfirmed:
          Boolean(holding?.vereinsmitgliedId) && !holding?.confirmedAt,
        condition: copy.condition,
        inventoryNumber: copy.inventoryNumber,
        ...toGameCopyAcquisition(copy),
        versionId: copy.versionId,
        ...versionDisplay(copy.version),
        ruleBookLanguages: copy.ruleBookLanguages,
        responsibleName,
        unitChain,
        responsibleContactMeeple: contactMeepleId
          ? (contactMeepleById.get(contactMeepleId) ?? null)
          : null,
        locationChain: formatLocationChain({ responsibleName, unitChain }),
      };
    },
  );
}
