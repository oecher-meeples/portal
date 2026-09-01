import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import {
  filterLudothekGames,
  findMaxDurationBound,
  listDistinctMechanics,
  parseLudothekSearchParams,
  toPublicGame,
} from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { buildPrivateLudothekGames } from "@/lib/ludothek/private-collection";
import { LudothekBrowser } from "@/components/feature/ludothek/ludothek-browser";
import { findCurrentEvent } from "@/lib/events/upcoming";
import { getAttendingExplainerBoardGameIds } from "@/lib/explainer/queries";
import { getPresentGameCopyIds } from "@/lib/events/guest-area";

export default async function LudothekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tier = await getSessionTier();
  const user = await getCurrentUser();
  // "internal" braucht mehr als nur eingeloggt zu sein — eine "Ausgetreten"-
  // Rolle (#332) verliert das Recht, während sie noch eingeloggt bleibt.
  const internal =
    tier !== "gast" &&
    (user ? await hasPermission(user.id, "ludothek:view") : false);
  const canManageGames = user
    ? await hasPermissionInCurrentView(user.id, "games:manage")
    : false;

  const rawSearchParams = await searchParams;
  const filters = parseLudothekSearchParams(rawSearchParams, { internal });

  const clubGames = await buildLudothekGames();
  // Nur geladen, wenn der "Auch Privatbesitz anzeigen"-Filter an ist — nie
  // für Gäste (#255-Folge: läuft in derselben Liste/denselben Filtern statt
  // eines separaten, statischen Blocks).
  const privateGames =
    internal && filters.showPrivateCollection
      ? await buildPrivateLudothekGames()
      : [];
  const allGames = [...clubGames, ...privateGames];

  // Gebraucht sowohl für den Gast-während-Event-Kontext des Erklärbär-Filters
  // (#256) als auch für "nur anwesende Spiele" (#273) — beide Filter sind
  // nur sinnvoll, solange ein Event läuft, für Meeples wie Gäste gleichermaßen.
  const currentEvent = await findCurrentEvent();
  const showExplainerFilter = internal || currentEvent !== null;
  const attendingExplainerBoardGameIds =
    !internal && filters.hasExplainer
      ? currentEvent
        ? await getAttendingExplainerBoardGameIds(currentEvent.id)
        : new Set<string>()
      : undefined;
  const showPresentFilter = currentEvent !== null;
  const presentGameCopyIds =
    filters.onlyPresentAtEvent && currentEvent
      ? await getPresentGameCopyIds(currentEvent.id)
      : undefined;

  const filtered = filterLudothekGames(allGames, filters, {
    attendingExplainerBoardGameIds,
    presentGameCopyIds,
  });

  const mechanicsOptions = listDistinctMechanics(allGames);
  const maxDurationBound = findMaxDurationBound(allGames);

  const meepleOptions = internal
    ? await (async () => {
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
    : undefined;

  return (
    <PageContainer variant="wide">
      <PageHeading
        eyebrow="Das Herzstück"
        title={`Ludothek – ${allGames.length} Spiele`}
        description="Durchstöbere den Vereinsbestand und filtere nach Spieleranzahl, Dauer oder Mechanik."
      />
      <LudothekBrowser
        games={internal ? filtered : filtered.map(toPublicGame)}
        internal={internal}
        canManageGames={internal && canManageGames}
        basePath="/ludothek"
        rawSearchParams={rawSearchParams}
        filters={filters}
        mechanicsOptions={mechanicsOptions}
        maxDurationBound={maxDurationBound}
        meepleOptions={meepleOptions}
        showExplainerFilter={showExplainerFilter}
        showPresentFilter={showPresentFilter}
      />
    </PageContainer>
  );
}
