import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFreeGamesInRoom } from "@/lib/events/guest-area";
import { GuestAreaView } from "@/components/feature/guest-area/guest-area-view";
import type { FreeGameEntry } from "@/components/feature/guest-area/free-games-list";

export default async function EventGuestAreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    notFound();
  }

  const freeGames = await getFreeGamesInRoom(event.id, {});

  const freeGameEntries: FreeGameEntry[] = freeGames.map((game) => ({
    id: game.id,
    title: game.title,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
  }));

  return (
    <GuestAreaView
      eventId={event.id}
      eventTitle={event.title}
      freeGames={freeGameEntries}
    />
  );
}
