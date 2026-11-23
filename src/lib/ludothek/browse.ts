import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import {
  filterLudothekGames,
  parseLudothekSearchParams,
  toPublicGame,
  type LudothekGame,
  type PublicLudothekGame,
} from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { buildPrivateLudothekGames } from "@/lib/ludothek/private-collection";
import { paginateByTitle } from "@/lib/ludothek/title-grouping";
import { resolveUnitFilter } from "@/lib/ludothek/unit-contents";
import { findCurrentEvent } from "@/lib/events/upcoming";
import { getAttendingExplainerBoardGameIds } from "@/lib/explainer/queries";
import { getPresentGameCopyIds } from "@/lib/events/guest-area";
import { truncateText } from "@/lib/utils/truncate";

type SearchParams = Record<string, string | string[] | undefined>;

/** Titel (nicht Exemplare) pro nachgeladener Seite (#461) — ein Vielfaches
 * von 2, 3 und 4, damit das Raster bei den üblichen Spaltenzahlen voll endet. */
export const LUDOTHEK_PAGE_SIZE = 48;

/** Beschreibung in der Liste (#461, Audit-Finding 17): die Zeile zeigt im
 * Hover den Text, nicht die ganze BGG-Beschreibung — der Rest bleibt auf der
 * Detailseite. Wer Titel bearbeiten darf, bekommt den vollen Text, weil der
 * Bearbeiten-Dialog ihn vorbelegt (sonst würde gekürzt gespeichert). */
export const LUDOTHEK_LIST_DESCRIPTION_MAX = 600;

export type LudothekClientGame = PublicLudothekGame | LudothekGame;

export type LudothekGamesPage = {
  games: LudothekClientGame[];
  /** Titel-Offset der nächsten Seite, `null` am Ende. */
  nextOffset: number | null;
};

/** Wer schaut, was ist eingestellt, läuft gerade ein Event — der Teil der
 * Ludothek-Seite, den das Nachladen (#461) genauso braucht wie der erste
 * Aufruf. Rechte werden immer serverseitig neu ermittelt, nie vom Client. */
export async function resolveLudothekBrowseContext(
  rawSearchParams: SearchParams,
) {
  // #525: alles, was nicht voneinander abhängt, parallel.
  const [tier, user, currentEvent] = await Promise.all([
    getSessionTier(),
    getCurrentUser(),
    // Gebraucht für den Gast-während-Event-Kontext des Erklärbär-Filters
    // (#256) und für "nur anwesende Spiele" (#273).
    findCurrentEvent(),
  ]);

  // "internal" braucht mehr als nur eingeloggt zu sein — eine "Ausgetreten"-
  // Rolle (#332) verliert das Recht, während sie noch eingeloggt bleibt.
  const [canViewInternal, canManageGames] = user
    ? await Promise.all([
        hasPermission(user.id, "ludothek:view"),
        hasPermissionInCurrentView(user.id, "games:manage"),
      ])
    : [false, false];
  const internal = tier !== "gast" && canViewInternal;

  return {
    internal,
    canManageGames: internal && canManageGames,
    filters: parseLudothekSearchParams(rawSearchParams, { internal }),
    currentEvent,
  };
}

export type LudothekBrowseContext = Awaited<
  ReturnType<typeof resolveLudothekBrowseContext>
>;

/** Lädt den Bestand und wendet die Filter an. Gefiltert wird bewusst im
 * Speicher (#461, Hybrid-Entscheidung): Zustand, Standortkette und
 * Anwesenheit entstehen erst aus Holdings und Einheitenketten. Paginiert
 * wird danach nur die Auslieferung an den Client. */
export async function loadFilteredLudothekGames({
  internal,
  filters,
  currentEvent,
}: Pick<LudothekBrowseContext, "internal" | "filters" | "currentEvent">) {
  const [
    clubGames,
    privateGames,
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
    unitFilter,
  ] = await Promise.all([
    buildLudothekGames(),
    // Nur mit "Auch Privatbesitz anzeigen" — nie für Gäste (#255-Folge).
    internal && filters.showPrivateCollection
      ? buildPrivateLudothekGames()
      : [],
    !internal && filters.hasExplainer
      ? currentEvent
        ? getAttendingExplainerBoardGameIds(currentEvent.id)
        : new Set<string>()
      : undefined,
    filters.onlyPresentAtEvent && currentEvent
      ? getPresentGameCopyIds(currentEvent.id)
      : undefined,
    // Gescanntes Einheiten-Etikett (#550) — auch für Gäste.
    filters.unit ? resolveUnitFilter(filters.unit) : null,
  ]);
  const allGames = [...clubGames, ...privateGames];

  const filtered = filterLudothekGames(allGames, filters, {
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
    unitGameCopyIds: unitFilter?.gameCopyIds,
  });

  return { allGames, filtered, unitFilter };
}

/** Eine Seite Titel in der Form, die der Client sehen darf: Gäste ohne
 * Standort-/Personendaten, die Beschreibung ohne `games:manage` gekürzt. */
export function toLudothekGamesPage(
  filtered: LudothekGame[],
  {
    internal,
    canManageGames,
    offset,
  }: { internal: boolean; canManageGames: boolean; offset: number },
): LudothekGamesPage {
  const { items, nextOffset } = paginateByTitle(
    filtered,
    offset,
    LUDOTHEK_PAGE_SIZE,
  );
  return {
    games: items.map((game) => {
      const trimmed =
        canManageGames || game.description === null
          ? game
          : {
              ...game,
              description: truncateText(
                game.description,
                LUDOTHEK_LIST_DESCRIPTION_MAX,
              ),
            };
      return internal ? trimmed : toPublicGame(trimmed);
    }),
    nextOffset,
  };
}
