"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentMeeple } from "@/lib/members/meeples";
import { actionPermissionDenied } from "@/lib/auth/action-guards";
import {
  canForceImport,
  getImportCooldownEndsAt,
} from "@/lib/ludothek/private-collection";
import {
  enqueuePrivateCollectionImport,
  processPrivateCollectionImportQueue,
} from "@/lib/ludothek/private-collection-import-queue";
import { formatTimePlain } from "@/lib/utils/format";

/** Einreihen + sofort im Hintergrund starten: `after()` läuft nach der
 * Antwort weiter, der Nutzer kann die Seite verlassen. Fällt der Prozess
 * dazwischen aus, holt der minütliche Cron den Job nach. */
async function queueImport(meepleId: string) {
  await enqueuePrivateCollectionImport(meepleId);
  after(async () => {
    await processPrivateCollectionImportQueue();
  });
  revalidatePath("/profil", "layout");
  return { success: true as const, queued: true as const };
}

/**
 * "Meine BGG-Collection importieren" im eigenen Profil (#255, #632): prüft
 * BGG-Namen und 1h-Cooldown und reiht den Import dann in die Queue ein
 * (`private-collection-import-queue.ts`), statt ihn in der Anfrage
 * auszuführen. Sysadmin ist vom Cooldown ausgenommen.
 *
 * `ignoreCooldown` ist der "!"-Button auf der Profil-Karte (Dev-Environment
 * und sysadmin dauerhaft) — das Flag aus dem Client-Aufruf allein zählt
 * nicht, `canForceImport()` prüft serverseitig erneut, wer es wirklich
 * nutzen darf.
 */
export async function syncPrivateBggCollection(ignoreCooldown = false) {
  const meeple = await getCurrentMeeple();
  if (!meeple) {
    return { error: "Keine Berechtigung." };
  }
  if (!meeple.bggUsername) {
    return {
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    };
  }

  const cooldownEndsAt =
    ignoreCooldown && (await canForceImport(meeple.neonAuthUserId))
      ? null
      : await getImportCooldownEndsAt(meeple);
  if (cooldownEndsAt) {
    return {
      error: `Import erst wieder ab ${formatTimePlain(cooldownEndsAt)} möglich (1h Cooldown).`,
    };
  }

  return queueImport(meeple.id);
}

/** Admin-Trigger auf dem Profil eines anderen Mitglieds (#632) — wenn der
 * Import dort schiefgegangen ist. Braucht `members:manage`; der 1h-Cooldown
 * entfällt, denn die Aktion ist eine bewusste Reparatur. Importiert gegen den
 * *gespeicherten* `bggUsername` des Ziels. */
export async function adminSyncPrivateBggCollection(meepleId: string) {
  const denied = await actionPermissionDenied("members:manage");
  if (denied) return denied;

  const target = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: { bggUsername: true },
  });
  if (!target?.bggUsername) {
    return {
      error: "Für dieses Mitglied ist kein BGG-Benutzername hinterlegt.",
    };
  }
  return queueImport(meepleId);
}
