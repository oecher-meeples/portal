import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { getSessionTier } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { isEventVisible } from "@/lib/events/visibility";
import {
  getFreeGamesInRoom,
  getGuestFleaMarketItems,
} from "@/lib/events/guest-area";
import { isBringAndBuyMarketOpen } from "@/lib/events/upcoming";
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

  const [tier, user] = await Promise.all([getSessionTier(), getCurrentUser()]);
  const canManageEvents =
    !!user && (await hasPermission(user.id, "events:manage"));
  if (!isEventVisible(event.visibility, { tier, canManageEvents })) {
    notFound();
  }

  const showBringAndBuy = isBringAndBuyMarketOpen(event);

  const [freeGames, fleaMarketItems] = await Promise.all([
    getFreeGamesInRoom(event.id, {}),
    showBringAndBuy ? getGuestFleaMarketItems(event.id) : Promise.resolve([]),
  ]);

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
      fleaMarketItems={fleaMarketItems}
    />
  );
}
