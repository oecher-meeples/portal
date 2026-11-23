"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
import { prisma } from "@/lib/utils/prisma";
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
  const meeple = await requireMeeple();
  await prisma.meeple.update({
    where: { id: meeple.id },
    data: { privateCollectionVisible: visible },
  });
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
