import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { prisma } from "@/lib/utils/prisma";
import {
  filterLudothekGames,
  findMaxDurationBound,
  listDistinctCategories,
  listDistinctMechanics,
  parseLudothekSearchParams,
  toPublicGame,
} from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { buildPrivateLudothekGames } from "@/lib/ludothek/private-collection";
import { hasUnconfirmedHoldingsForMeeple } from "@/lib/ludothek/holdings";
import { LudothekBrowser } from "@/components/feature/ludothek/ludothek-browser";
import { findCurrentEvent } from "@/lib/events/upcoming";
import { getAttendingExplainerBoardGameIds } from "@/lib/explainer/queries";
import { getPresentGameCopyIds } from "@/lib/events/guest-area";
import { loadBoardGameTraitTextsByTrait } from "@/lib/ludothek/board-game-trait-texts";
import { parseShortId } from "@/lib/short-id/short-id";
import { firstString } from "@/lib/utils/search-params";
import { buildHref } from "@/lib/utils/query-string";
import { resolveUnitFilter } from "@/lib/ludothek/unit-contents";

export default async function LudothekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // #525: alles, was nicht voneinander abhängt, in Wellen parallel statt
  // nacheinander — Auth-Lookups sind per `cache()` ohnehin je Request einmal.
  const [tier, user, rawSearchParams, clubGames, traitTexts, currentEvent] =
    await Promise.all([
      getSessionTier(),
      getCurrentUser(),
      searchParams,
      buildLudothekGames(),
      loadBoardGameTraitTextsByTrait(),
      // Gebraucht sowohl für den Gast-während-Event-Kontext des Erklärbär-
      // Filters (#256) als auch für "nur anwesende Spiele" (#273) — beide
      // Filter sind nur sinnvoll, solange ein Event läuft.
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

  const filters = parseLudothekSearchParams(rawSearchParams, { internal });
  // `?neu=inv-<n>` (#549): Ziel des Short-ID-Routers für ein gescanntes,
  // noch unbekanntes Exemplar-Etikett — ohne Recht wirkungslos.
  const createShortId =
    internal && canManageGames
      ? parseShortId(firstString(rawSearchParams.neu) ?? "")
      : null;
  const createInventoryNumber =
    createShortId?.kind === "inv" ? createShortId.id : undefined;
  const showExplainerFilter = internal || currentEvent !== null;
  const showPresentFilter = currentEvent !== null;

  const [
    currentMeeple,
    privateGames,
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
    unitFilter,
  ] = await Promise.all([
    internal ? getCurrentMeeple() : null,
    // Nur geladen, wenn der "Auch Privatbesitz anzeigen"-Filter an ist — nie
    // für Gäste (#255-Folge: läuft in derselben Liste/denselben Filtern statt
    // eines separaten, statischen Blocks).
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

  // "Meine Ausleihen"-Filter (#290): kein eigener Bestätigen-Weg hier, nur
  // ein Hinweis zurück zum Dashboard, wo die eigentliche Aktion sitzt.
  const showsOwnLoans =
    currentMeeple !== null && filters.atMeepleId === currentMeeple.id;

  const filtered = filterLudothekGames(allGames, filters, {
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
    unitGameCopyIds: unitFilter?.gameCopyIds,
  });

  const mechanicsOptions = listDistinctMechanics(allGames);
  const categoriesOptions = listDistinctCategories(allGames);
  const maxDurationBound = findMaxDurationBound(allGames);

  const [hasUnconfirmedOwnHoldings, meepleOptions] = await Promise.all([
    showsOwnLoans ? hasUnconfirmedHoldingsForMeeple(currentMeeple.id) : false,
    internal
      ? (async () => {
          const ids = [
            ...new Set(
              allGames
                .map((g) => g.responsibleMeepleId)
                .filter((id): id is string => id !== null),
            ),
          ];
          if (ids.length === 0) return [];
          return prisma.meeple.findMany({
            where: { id: { in: ids } },
            select: { id: true, displayName: true },
            orderBy: { displayName: "asc" },
          });
        })()
      : undefined,
  ]);

  return (
    <PageContainer variant="wide">
      <PageHeading
        eyebrow="Das Herzstück"
        title={`Ludothek – ${allGames.length} Spiele`}
        description="Durchstöbere den Vereinsbestand und filtere nach Spieleranzahl, Dauer oder Mechanik."
      />
      {hasUnconfirmedOwnHoldings && (
        <p className={cn(cardVariants({ size: "sm" }), "block text-sm")}>
          Du hast noch unbestätigte Spiele.{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            Zum Dashboard
          </Link>
        </p>
      )}
      {filters.unit && (
        <p
          className={cn(
            cardVariants({ size: "sm" }),
            "flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm",
          )}
        >
          <span>
            {unitFilter
              ? `Gefiltert nach ${unitFilter.unit.label} (${unitFilter.unit.code}) – inklusive allem, was darin steht.`
              : "Diese Einheit gibt es nicht."}
          </span>
          <Link
            href={buildHref("/ludothek", rawSearchParams, {
              einheit: undefined,
            })}
            className="text-primary hover:underline"
          >
            Filter entfernen
          </Link>
          {unitFilter && internal && canManageGames && (
            <Link
              href={`/admin/einheiten/${unitFilter.unit.id}`}
              className="text-primary hover:underline"
            >
              Zur Einheit
            </Link>
          )}
        </p>
      )}
      <LudothekBrowser
        games={internal ? filtered : filtered.map(toPublicGame)}
        internal={internal}
        canManageGames={internal && canManageGames}
        basePath="/ludothek"
        rawSearchParams={rawSearchParams}
        filters={filters}
        mechanicsOptions={mechanicsOptions}
        categoriesOptions={categoriesOptions}
        maxDurationBound={maxDurationBound}
        meepleOptions={meepleOptions}
        showExplainerFilter={showExplainerFilter}
        showPresentFilter={showPresentFilter}
        traitTexts={traitTexts}
        createInventoryNumber={createInventoryNumber}
      />
    </PageContainer>
  );
}
