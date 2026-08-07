import { PageHeading } from "@/components/ui/page-heading";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/utils/prisma";
import {
  filterLudothekGames,
  parseLudothekSearchParams,
  toPublicGame,
} from "@/lib/ludothek/browser";
import { buildLudothekGames } from "@/lib/ludothek/query";
import { buildPrivateCollectionResults } from "@/lib/ludothek/private-collection";
import { LudothekBrowser } from "@/components/feature/ludothek/ludothek-browser";

export default async function LudothekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tier = await getSessionTier();
  const internal = tier !== "gast";

  const user = await getCurrentUser();
  const canManageGames = user
    ? await hasPermissionInCurrentView(user.id, "games:manage")
    : false;

  const rawSearchParams = await searchParams;
  const filters = parseLudothekSearchParams(rawSearchParams, { internal });

  const allGames = await buildLudothekGames();
  const filtered = filterLudothekGames(allGames, filters);

  const mechanicsOptions = [
    ...new Set(allGames.flatMap((g) => g.mechanics)),
  ].sort();

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

  // Internal-only, and only fetched when the toggle is on — never reaches the guest path.
  const privateCollectionResults =
    internal && filters.showPrivateCollection
      ? buildPrivateCollectionResults(
          await prisma.privateGameCollectionEntry.findMany({
            include: {
              meeple: { select: { displayName: true } },
              boardGame: {
                select: {
                  title: true,
                  imageUrl: true,
                  minPlayers: true,
                  maxPlayers: true,
                  playTimeMinutes: true,
                },
              },
            },
          }),
          filters,
        )
      : undefined;

  return (
    <div className="flex flex-col gap-6">
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
        meepleOptions={meepleOptions}
        privateCollectionResults={privateCollectionResults}
      />
    </div>
  );
}
