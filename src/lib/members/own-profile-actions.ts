"use server";

import { revalidatePath } from "next/cache";
import type { NewsletterCategory } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { computeMembershipEndsAt, requireMeeple } from "@/lib/members/meeples";
import {
  collectMeeplePersonalData,
  type MeepleDataExport,
} from "@/lib/members/data-export";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { setMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";

/**
 * Self-service actions shared by the old `/profil` (`feature/profil/`, gone
 * after step 13) and the new `/profil`/`/profil/[slug]` (`feature/mitglied-profil/`)
 * while both exist — moved out of `feature/profil/actions.ts` into `lib/`
 * (#385) so neither feature imports from the other
 * (`import/no-restricted-paths`). Deliberately still only ever acts on the
 * *caller's own* Meeple/Member (`requireMeeple()`), never a client-supplied
 * id — unrelated to the Guardian-on-behalf-of-a-child flows in
 * `pending-changes.ts`/`stammdaten-actions.ts`.
 */

/** Vereinsmitglied-Zeile eines Meeples (#328) — Bankdaten/Kündigung leben
 * dort. Fehlt sie (noch keine Migration/Einladung verknüpft), gibt es
 * bewusst keinen automatischen Anlage-Versuch hier. */
export async function requireOwnMember(meepleId: string) {
  const member = await prisma.member.findUnique({ where: { meepleId } });
  if (!member) {
    return {
      error:
        "Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende dich an den Vorstand.",
    };
  }
  return { success: true as const, member };
}

/** Art. 15 / Art. 20 self-service: hands the caller their own data, never anyone else's. */
export async function exportOwnPersonalData(): Promise<
  { error: string } | { success: true; data: MeepleDataExport }
> {
  const meeple = await requireMeeple();

  const data = await collectMeeplePersonalData(meeple.id);
  if (!data) {
    return { error: "Zu diesem Konto wurden keine Daten gefunden." };
  }

  return { success: true, data };
}

/**
 * Art. 17 request. Deliberately not blocked by open holdings — the right to ask
 * exists regardless; the UI shows what still needs returning, and the admin side
 * keeps the actual anonymisation gated on it.
 */
export async function requestOwnDeletion() {
  const meeple = await requireMeeple();

  if (await findOpenDeletionRequest(meeple.id)) {
    return { error: "Für dich liegt bereits ein offener Löschantrag vor." };
  }

  await prisma.deletionRequest.create({ data: { meepleId: meeple.id } });

  revalidatePath("/profil");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function withdrawOwnDeletionRequest() {
  const meeple = await requireMeeple();

  const open = await findOpenDeletionRequest(meeple.id);
  if (!open) {
    return { error: "Es liegt kein offener Löschantrag vor." };
  }

  await prisma.deletionRequest.delete({ where: { id: open.id } });

  revalidatePath("/profil");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function updateNewsletterPreference(input: {
  enabled: boolean;
  categories: NewsletterCategory[];
}) {
  const meeple = await requireMeeple();

  await setMeepleNewsletterPreference(meeple.id, input);

  revalidatePath("/profil");
  return { success: true as const };
}

/** Records the resignation; the membership itself runs until the turn of the year
 * (with a 4-week minimum-notice rule, see computeMembershipEndsAt). */
export async function resignOwnMembership() {
  const meeple = await requireMeeple();

  const ownMember = await requireOwnMember(meeple.id);
  if (!ownMember.success) return { error: ownMember.error };

  if (ownMember.member.resignedAt) {
    return {
      error: "Für diese Mitgliedschaft liegt bereits eine Kündigung vor.",
    };
  }

  const now = new Date();
  const membershipEndsAt = computeMembershipEndsAt(now);

  await prisma.member.update({
    where: { meepleId: meeple.id },
    data: { resignedAt: now, membershipEndsAt },
  });

  revalidatePath("/profil");
  return { success: true as const, membershipEndsAt };
}
