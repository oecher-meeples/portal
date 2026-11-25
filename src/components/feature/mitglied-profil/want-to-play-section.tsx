import { WantToPlayListCard } from "@/components/feature/mitglied-profil/want-to-play-list-card";
import {
  countWantToPlay,
  listWantToPlay,
} from "@/lib/ludothek/want-to-play-list";

/** Lädt die erste Seite der Want-to-Play-Liste (#637) und zeigt die Karte:
 * dem Besitzer immer (auch leer, mit Erklärung), anderen nur bei nicht
 * leerer Liste. */
export async function WantToPlaySection({
  meepleId,
  isOwner,
}: {
  meepleId: string;
  isOwner: boolean;
}) {
  const [total, page] = await Promise.all([
    countWantToPlay(meepleId),
    listWantToPlay(meepleId),
  ]);
  if (total === 0 && !isOwner) return null;
  return (
    <WantToPlayListCard
      meepleId={meepleId}
      initialItems={page.items}
      initialCursor={page.nextCursor}
      total={total}
      isOwner={isOwner}
    />
  );
}
