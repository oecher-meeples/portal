"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
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
