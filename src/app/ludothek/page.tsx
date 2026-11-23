import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { prisma } from "@/lib/utils/prisma";
import {
  findMaxDurationBound,
  listDistinctCategories,
  listDistinctMechanics,
} from "@/lib/ludothek/browser";
import {
  loadFilteredLudothekGames,
  resolveLudothekBrowseContext,
  toLudothekGamesPage,
} from "@/lib/ludothek/browse";
import { hasUnconfirmedHoldingsForMeeple } from "@/lib/ludothek/holdings";
import { LudothekBrowser } from "@/components/feature/ludothek/ludothek-browser";
import { loadBoardGameTraitTextsByTrait } from "@/lib/ludothek/board-game-trait-texts";
import { parseShortId } from "@/lib/short-id/short-id";
import { firstString } from "@/lib/utils/search-params";
import { buildHref } from "@/lib/utils/query-string";

export default async function LudothekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  // Dieselbe Pipeline wie das Nachladen in `loadMoreLudothekGames` (#461).
  const [context, traitTexts] = await Promise.all([
    resolveLudothekBrowseContext(rawSearchParams),
    loadBoardGameTraitTextsByTrait(),
  ]);
  const { internal, canManageGames, filters, currentEvent } = context;
  // `?neu=inv-<n>` (#549): Ziel des Short-ID-Routers für ein gescanntes,
  // noch unbekanntes Exemplar-Etikett — ohne Recht wirkungslos.
  const createShortId = canManageGames
    ? parseShortId(firstString(rawSearchParams.neu) ?? "")
    : null;
  const createInventoryNumber =
    createShortId?.kind === "inv" ? createShortId.id : undefined;
  const showExplainerFilter = internal || currentEvent !== null;
  const showPresentFilter = currentEvent !== null;

  const [currentMeeple, { allGames, filtered, unitFilter }] = await Promise.all(
    [internal ? getCurrentMeeple() : null, loadFilteredLudothekGames(context)],
  );
  const firstPage = toLudothekGamesPage(filtered, { ...context, offset: 0 });

  // "Meine Ausleihen"-Filter (#290): kein eigener Bestätigen-Weg hier, nur
  // ein Hinweis zurück zum Dashboard, wo die eigentliche Aktion sitzt.
  const showsOwnLoans =
    currentMeeple !== null && filters.atMeepleId === currentMeeple.id;

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
          {unitFilter && canManageGames && (
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
        games={firstPage.games}
        nextOffset={firstPage.nextOffset}
        internal={internal}
        canManageGames={canManageGames}
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
