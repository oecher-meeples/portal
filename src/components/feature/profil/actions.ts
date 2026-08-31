"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeple } from "@/lib/members/meeples";
import {
  requestEmailChange,
  requestIbanChange,
} from "@/lib/members/pending-changes";
import { optionalHandle, optionalText } from "@/lib/utils/optional-text";
import { requireOwnMember } from "@/lib/members/own-profile-actions";

export {
  exportOwnPersonalData,
  requestOwnDeletion,
  resignOwnMembership,
  updateNewsletterPreference,
  withdrawOwnDeletionRequest,
} from "@/lib/members/own-profile-actions";

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
