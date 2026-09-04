import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { PageHeading } from "@/components/ui/page-heading";
import { ErklaerbaerenView } from "@/components/feature/erklaerbaeren/erklaerbaeren-view";
import type { ExplainerDirectoryEntry } from "@/components/feature/erklaerbaeren/explainer-directory";
import type { MyExplainerGame } from "@/components/feature/erklaerbaeren/my-explainer-games";

export default async function ErklaerbaerenPage() {
  const { user, meeple } = await requireMember();
  const isAdmin = await hasPermissionInCurrentView(user.id, "admin:access");

  const [explainerGames, availableGames] = await Promise.all([
    prisma.explainerGame.findMany({
      orderBy: { boardGame: { title: "asc" } },
      include: {
        boardGame: { select: { id: true, title: true } },
        meeple: {
          select: {
            id: true,
            displayName: true,
            profilePictureUrl: true,
            profilePictureVisibility: true,
          },
        },
      },
    }),
    prisma.boardGame.findMany({
      where: { copies: { some: { status: "ACTIVE" } } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const directoryByGame = new Map<string, ExplainerDirectoryEntry>();
  const myGames: MyExplainerGame[] = [];

  for (const entry of explainerGames) {
    const existing = directoryByGame.get(entry.boardGame.id) ?? {
      boardGameId: entry.boardGame.id,
      boardGameTitle: entry.boardGame.title,
      explainers: [],
    };
    existing.explainers.push({
      meepleId: entry.meeple.id,
      displayName: entry.meeple.displayName,
      level: entry.level,
      profilePictureUrl: entry.meeple.profilePictureUrl,
      profilePictureVisibility: entry.meeple.profilePictureVisibility,
    });
    directoryByGame.set(entry.boardGame.id, existing);

    if (entry.meeple.id === meeple.id) {
      myGames.push({
        boardGameId: entry.boardGame.id,
        boardGameTitle: entry.boardGame.title,
        level: entry.level,
      });
    }
  }

  // Games without an Erklärbär are absent from `explainerGames` above —
  // the admin view can still show them (toggled via a Switch, #210).
  for (const game of availableGames) {
    if (!directoryByGame.has(game.id)) {
      directoryByGame.set(game.id, {
        boardGameId: game.id,
        boardGameTitle: game.title,
        explainers: [],
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Erklärbären"
        description="Trage ein, welche Spiele du erklären kannst und wie sicher du dabei bist."
      />
      <ErklaerbaerenView
        directory={[...directoryByGame.values()]}
        myGames={myGames}
        availableGames={availableGames}
        isAdmin={isAdmin}
      />
    </div>
  );
}
