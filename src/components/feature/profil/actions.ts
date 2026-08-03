"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import {
  encryptSecret,
  ibanLast4,
  isValidIban,
  normaliseIban,
} from "@/lib/utils/crypto";
import { nextTurnOfTheYear, requireMeeple } from "@/lib/members/meeples";
import {
  collectMeeplePersonalData,
  type MeepleDataExport,
} from "@/lib/members/data-export";

export type OwnProfileInput = {
  displayName: string;
  bggUsername?: string | null;
  bgaUsername?: string | null;
  telegramHandle?: string | null;
  signalHandle?: string | null;
  discordHandle?: string | null;
};

export type OwnBankDetailsInput = {
  accountHolder: string;
  iban: string;
};

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalHandle(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/^@+/, "");
  return trimmed ? trimmed : null;
}

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
    },
  });

  revalidatePath("/profil");
  return { success: true as const };
}

export async function updateOwnBankDetails(input: OwnBankDetailsInput) {
  const meeple = await requireMeeple();

  const accountHolder = input.accountHolder.trim();
  if (!accountHolder) {
    return { error: "Bitte den Kontoinhaber angeben." };
  }

  const iban = normaliseIban(input.iban);
  if (!isValidIban(iban)) {
    return { error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe." };
  }

  await prisma.meeple.update({
    where: { id: meeple.id },
    data: {
      accountHolder,
      ibanEncrypted: encryptSecret(iban),
      ibanLast4: ibanLast4(iban),
    },
  });

  revalidatePath("/profil");
  return { success: true as const, ibanLast4: ibanLast4(iban) };
}

export async function clearOwnBankDetails() {
  const meeple = await requireMeeple();

  await prisma.meeple.update({
    where: { id: meeple.id },
    data: { accountHolder: null, ibanEncrypted: null, ibanLast4: null },
  });

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

/** Records the resignation; the membership itself runs until the turn of the year. */
export async function resignOwnMembership() {
  const meeple = await requireMeeple();

  if (meeple.resignedAt) {
    return {
      error: "Für diese Mitgliedschaft liegt bereits eine Kündigung vor.",
    };
  }

  const now = new Date();
  const membershipEndsAt = nextTurnOfTheYear(now);

  await prisma.meeple.update({
    where: { id: meeple.id },
    data: { resignedAt: now, membershipEndsAt },
  });

  revalidatePath("/profil");
  return { success: true as const, membershipEndsAt };
}
