"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { computeMembershipEndsAt, requireMeeple } from "@/lib/members/meeples";
import {
  collectMeeplePersonalData,
  type MeepleDataExport,
} from "@/lib/members/data-export";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { setMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";
import {
  requestEmailChange,
  requestIbanChange,
} from "@/lib/members/pending-changes";
import type { NewsletterCategory } from "@prisma/client";
import { optionalHandle, optionalText } from "@/lib/utils/optional-text";

export type OwnProfileInput = {
  displayName: string;
  bggUsername?: string | null;
  bgaUsername?: string | null;
  telegramHandle?: string | null;
  signalHandle?: string | null;
  discordHandle?: string | null;
  address?: string | null;
  shareAddress?: boolean;
  doorbellNote?: string | null;
  /** Opt-in: gibt die private BGG-Collection für andere interne Nutzer:innen
   * frei (#255). */
  privateCollectionVisible?: boolean;
};

export type OwnBankDetailsInput = {
  accountHolder: string;
  iban: string;
};

export async function updateOwnProfile(input: OwnProfileInput) {
  const meeple = await requireMeeple();

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { error: "Bitte einen Anzeigenamen angeben." };
  }

  await prisma.meeple.update({
    where: { id: meeple.id },
    data: {
      displayName,
      bggUsername: optionalText(input.bggUsername),
      bgaUsername: optionalText(input.bgaUsername),
      telegramHandle: optionalHandle(input.telegramHandle),
      signalHandle: optionalHandle(input.signalHandle),
      discordHandle: optionalHandle(input.discordHandle),
      address: optionalText(input.address),
      shareAddress: input.shareAddress ?? false,
      doorbellNote: optionalText(input.doorbellNote),
      privateCollectionVisible: input.privateCollectionVisible ?? false,
    },
  });

  revalidatePath("/profil");
  revalidatePath("/ludothek");
  return { success: true as const };
}

/**
 * Vereinsmitglied-Zeile eines Meeples (#328) — Bankdaten/Kündigung leben dort.
 * Fehlt sie (noch keine Migration/Einladung verknüpft, siehe Paket 3), gibt
 * es bewusst keinen automatischen Anlage-Versuch hier: das eigenständige
 * Anlegen einer Vereinsmitglied-Zeile für einen bestehenden Meeple ist erst
 * Teil des Einladungs-Redeem-Flows (#329).
 */
async function requireOwnMember(meepleId: string) {
  const member = await prisma.member.findUnique({ where: { meepleId } });
  if (!member) {
    return {
      error:
        "Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende dich an den Vorstand.",
    };
  }
  return { success: true as const, member };
}

/** Schreibt seit #330 nicht mehr direkt — legt einen `PendingChange` an, der
 * erst nach Kassenwart-Freigabe wirksam wird. */
export async function updateOwnBankDetails(input: OwnBankDetailsInput) {
  const meeple = await requireMeeple();

  const ownMember = await requireOwnMember(meeple.id);
  if (!ownMember.success) return { error: ownMember.error };

  const result = await requestIbanChange(ownMember.member.id, input);
  if ("error" in result) return result;

  revalidatePath("/profil");
  return { success: true as const };
}

/** Vereinsmitglied-E-Mail (nicht die Login-E-Mail!) — braucht
 * Bestätigungslink + Vorstandsfreigabe, siehe `pending-changes.ts`. */
export async function requestOwnEmailChange(newEmail: string) {
  const meeple = await requireMeeple();

  const ownMember = await requireOwnMember(meeple.id);
  if (!ownMember.success) return { error: ownMember.error };

  const result = await requestEmailChange(ownMember.member.id, newEmail);
  if ("error" in result) return result;

  revalidatePath("/profil");
  return { success: true as const };
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
