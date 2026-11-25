"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
import { prisma } from "@/lib/utils/prisma";
import { setWantToPlayMark } from "@/lib/ludothek/want-to-play-list";
import {
  offerPrivateGameForEvent,
  withdrawPrivateGameOffer,
} from "@/lib/ludothek/private-event-loans";

/** Eigentümer:in gibt ein eigenes Spiel für ein Event zur Ausleihe frei
 * (#122) — die eigentliche Prüfung (gehört der Titel überhaupt zur eigenen
 * Collection?) läuft serverseitig in `offerPrivateGameForEvent()`, hier nur
 * Auth + Revalidierung. */
export async function offerPrivateGameForEventAction(
  eventId: string,
  boardGameId: string,
) {
  const meeple = await requireMeeple();
  const result = await offerPrivateGameForEvent(
    meeple.id,
    eventId,
    boardGameId,
  );
  if ("success" in result) revalidatePath("/profil");
  return result;
}

/** Opt-in (#255): die eigene private Collection anderen Meeple zeigen —
 * in der Ludothek („Auch Privatbesitz anzeigen") und auf dem eigenen Profil.
 * Immer nur für die eigene Session, nie per übergebener Meeple-ID. */
export async function setPrivateCollectionVisibleAction(visible: boolean) {
  return updateOwnShareFlag({ privateCollectionVisible: visible });
}

/** Weitere Schalter der eigenen Collection: „Want to Play" beim BGG-Import
 * mit übernehmen (#637) bzw. „For Trade" für andere Meeple zeigen (#632-Folge).
 * Whitelist statt freiem Feldnamen — der Client darf nur diese beiden Flags
 * umschalten. */
export async function setPrivateCollectionShareAction(
  flag: "importWantToPlay" | "shareForTrade",
  value: boolean,
) {
  if (flag !== "importWantToPlay" && flag !== "shareForTrade") {
    return { error: "Ungültige Freigabe." };
  }
  return updateOwnShareFlag(
    flag === "importWantToPlay"
      ? { importWantToPlay: value }
      : { shareForTrade: value },
  );
}

async function updateOwnShareFlag(
  data:
    | { privateCollectionVisible: boolean }
    | { importWantToPlay: boolean }
    | { shareForTrade: boolean },
) {
  const meeple = await requireMeeple();
  await prisma.meeple.update({ where: { id: meeple.id }, data });
  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const };
}

export async function withdrawPrivateGameOfferAction(
  eventId: string,
  boardGameId: string,
) {
  const meeple = await requireMeeple();
  const result = await withdrawPrivateGameOffer(
    meeple.id,
    eventId,
    boardGameId,
  );
  if ("success" in result) revalidatePath("/profil");
  return result;
}

/** Einen Titel aus der eigenen privaten Collection entfernen (Bearbeiten-
 * Modus im Dialog). Nur Einträge der eigenen Session — `deleteMany` mit
 * `meepleId` statt `delete` per ID, damit fremde IDs ins Leere laufen. Der
 * nächste BGG-Import legt den Titel wieder an, falls er dort noch als
 * besessen geführt wird. */
export async function removePrivateCollectionEntryAction(entryId: string) {
  const meeple = await requireMeeple();
  await prisma.privateGameCollectionEntry.deleteMany({
    where: { id: entryId, meepleId: meeple.id },
  });
  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const };
}

/** „For Trade"/„Want to Play" eines eigenen Eintrags setzen oder entfernen.
 * Whitelist statt freiem Feldnamen. „For Trade" hängt am Eintrag und gilt bis
 * zum nächsten BGG-Import; „Want to Play" liegt in `game_want_to_play` (#637)
 * und bleibt über Importe hinweg bestehen. */
export async function setPrivateCollectionEntryFlagAction(
  entryId: string,
  flag: "forTrade" | "wantToPlay",
  value: boolean,
) {
  if (flag !== "forTrade" && flag !== "wantToPlay") {
    return { error: "Ungültige Markierung." };
  }
  const meeple = await requireMeeple();
  if (flag === "forTrade") {
    await prisma.privateGameCollectionEntry.updateMany({
      where: { id: entryId, meepleId: meeple.id },
      data: { forTrade: value },
    });
  } else {
    const entry = await prisma.privateGameCollectionEntry.findFirst({
      where: { id: entryId, meepleId: meeple.id },
      select: { boardGameId: true },
    });
    if (!entry) return { error: "Eintrag nicht gefunden." };
    await setWantToPlayMark(meeple.id, entry.boardGameId, value);
  }
  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const };
}
