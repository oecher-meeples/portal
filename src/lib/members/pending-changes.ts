import "server-only";
import { randomBytes } from "node:crypto";
import { PendingChangeKind, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  decryptSecret,
  encryptSecret,
  ibanLast4,
  isValidIban,
  normaliseIban,
} from "@/lib/utils/crypto";
import { isValidEmail } from "@/lib/utils/validate-email";
import {
  buildEmailChangeConfirmationLink,
  sendEmailChangeConfirmationMail,
  sendPendingChangeRejectedMail,
} from "@/lib/members/pending-change-mail";
import {
  computeExpiresAt,
  daysToMinutes,
  findOpenInviteByEmail,
} from "@/lib/members/invites";
import { getDefaultInviteDays } from "@/lib/members/invite-settings";

function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

/**
 * Änderungsanträge an sensiblen `Member`-Feldern (#330) — IBAN braucht nur
 * Kassenwart-Freigabe, die Vereinsmitglied-E-Mail zusätzlich einen
 * Bestätigungslink (Erreichbarkeit) vor der Vorstandsfreigabe. Die
 * Login-E-Mail (`Meeple`/Neon Auth) läuft **nicht** hierüber — die ändert
 * sich direkt mit Bestätigungslink, ohne Board-Freigabe.
 */

async function replaceOpenPendingChange(
  memberId: string,
  kind: PendingChangeKind,
) {
  // Ein neuer Antrag ersetzt automatisch einen noch offenen (#330) — kein
  // "Ablehnen"-Mail nötig, der alte Antrag war schlicht überholt.
  await prisma.pendingChange.deleteMany({
    where: { memberId, kind, approvedAt: null, rejectedAt: null },
  });
}

export async function requestIbanChange(
  memberId: string,
  { accountHolder, iban }: { accountHolder: string; iban: string },
) {
  const trimmedHolder = accountHolder.trim();
  if (!trimmedHolder) {
    return { error: "Bitte den Kontoinhaber angeben." };
  }

  const normalised = normaliseIban(iban);
  if (!isValidIban(normalised)) {
    return { error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe." };
  }

  await replaceOpenPendingChange(memberId, PendingChangeKind.IBAN);
  await prisma.pendingChange.create({
    data: {
      memberId,
      kind: PendingChangeKind.IBAN,
      // Verschlüsselt wie Member.ibanEncrypted (#357) — vorher lag die neue
      // IBAN zwischen Antragstellung und Kassenwart-Freigabe im Klartext.
      newValue: encryptSecret(normalised),
      newAccountHolder: trimmedHolder,
    },
  });

  return { success: true as const };
}

export async function requestEmailChange(memberId: string, newEmail: string) {
  const normalised = newEmail.trim().toLowerCase();
  if (!isValidEmail(normalised)) {
    return { error: "Ungültige E-Mail-Adresse." };
  }

  const conflict = await prisma.member.findUnique({
    where: { email: normalised },
  });
  if (conflict && conflict.id !== memberId) {
    return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
  }

  await replaceOpenPendingChange(memberId, PendingChangeKind.MEMBER_EMAIL);
  const change = await prisma.pendingChange.create({
    data: {
      memberId,
      kind: PendingChangeKind.MEMBER_EMAIL,
      newValue: normalised,
      confirmToken: randomBytes(24).toString("hex"),
    },
  });

  const confirmLink = buildEmailChangeConfirmationLink(
    siteUrl(),
    change.confirmToken!,
  );
  await sendEmailChangeConfirmationMail(normalised, confirmLink);

  return { success: true as const };
}

export async function confirmEmailChange(token: string) {
  const change = await prisma.pendingChange.findUnique({
    where: { confirmToken: token },
  });
  if (!change || change.kind !== PendingChangeKind.MEMBER_EMAIL) {
    return { error: "Bestätigungslink ungültig oder bereits verwendet." };
  }
  if (change.rejectedAt) {
    return { error: "Dieser Änderungsantrag wurde bereits abgelehnt." };
  }

  await prisma.pendingChange.update({
    where: { id: change.id },
    data: { confirmedAt: new Date(), confirmToken: null },
  });

  return { success: true as const };
}

/** #362: ob für die *aktuell* hinterlegte E-Mail-Adresse eines Mitglieds noch
 * eine offene Einladung existiert — die Grundlage für das
 * Widerrufen-und-neu-erstellen-Popup vor der Freigabe einer
 * MEMBER_EMAIL-Änderung. Kein automatisches Kaskadieren des
 * E-Mail+Token-Doppelschlüssels, nur eine informierte Entscheidung. */
export async function hasOpenInviteForMemberEmail(
  memberId: string,
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { email: true },
  });
  if (!member?.email) return false;
  const invite = await findOpenInviteByEmail(member.email);
  return invite !== null;
}

/** Ein Feld-Diff für einen `MEMBER_STAMMDATEN`-Antrag (#379) — mehrere
 * geänderte Felder auf einmal, ein Freigeben/Ablehnen für den ganzen Antrag.
 * Die Werte sind bereits die roh zu speichernden Spaltenwerte (z. B.
 * `tshirtSizeId` statt eines Labels). */
export type StammdatenDiff = Record<string, { old: unknown; new: unknown }>;

export async function requestStammdatenChange(
  memberId: string,
  diff: StammdatenDiff,
) {
  if (Object.keys(diff).length === 0) {
    return { error: "Keine Änderung ausgewählt." };
  }

  await replaceOpenPendingChange(memberId, PendingChangeKind.MEMBER_STAMMDATEN);
  await prisma.pendingChange.create({
    data: {
      memberId,
      kind: PendingChangeKind.MEMBER_STAMMDATEN,
      // Ungenutzt für diesen Kind — der eigentliche Inhalt steht in fieldsJson.
      newValue: "",
      fieldsJson: JSON.stringify(diff),
    },
  });

  return { success: true as const };
}

/**
 * Kassenwart (IBAN) bzw. Vorstand (MEMBER_EMAIL) — welche Berechtigung das
 * konkret voraussetzt, gated die aufrufende Server Action, nicht diese
 * Funktion (die kennt nur die fachliche Reihenfolge: E-Mail-Änderungen erst
 * nach Bestätigung durch das Mitglied freigebbar).
 */
export async function approvePendingChange(
  id: string,
  approverId: string,
  options?: {
    /** #362: bei MEMBER_EMAIL zusätzlich eine noch offene Einladung für die
     * *alte* Adresse widerrufen und sofort eine neue für die neue Adresse
     * ausstellen. Nur wirksam, wenn eine solche Einladung tatsächlich
     * existiert — sonst ein No-op. */
    revokeAndReissueInvite?: boolean;
  },
) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change) {
    return { error: "Änderungsantrag nicht gefunden." };
  }
  if (change.approvedAt || change.rejectedAt) {
    return { error: "Über diesen Antrag wurde bereits entschieden." };
  }
  if (change.kind === PendingChangeKind.MEMBER_EMAIL && !change.confirmedAt) {
    return {
      error:
        "Das Mitglied muss die neue E-Mail-Adresse erst über den Bestätigungslink bestätigen.",
    };
  }

  // Außerhalb der Transaktion gelesen — reine Konfiguration, kein
  // Konsistenzrisiko, wenn sie sich zwischen Lesen und Commit ändert.
  const defaultInviteDays =
    options?.revokeAndReissueInvite &&
    change.kind === PendingChangeKind.MEMBER_EMAIL
      ? await getDefaultInviteDays()
      : null;

  await prisma.$transaction(async (tx) => {
    if (change.kind === PendingChangeKind.IBAN) {
      // `newValue` ist seit #357 bereits verschlüsselt (wie
      // `Member.ibanEncrypted`) — nur für `ibanLast4` kurz entschlüsseln.
      await tx.member.update({
        where: { id: change.memberId },
        data: {
          accountHolder: change.newAccountHolder,
          ibanEncrypted: change.newValue,
          ibanLast4: ibanLast4(decryptSecret(change.newValue)),
        },
      });
    } else if (change.kind === PendingChangeKind.MEMBER_STAMMDATEN) {
      const diff = JSON.parse(change.fieldsJson ?? "{}") as StammdatenDiff;
      const data = Object.fromEntries(
        Object.entries(diff).map(([field, { new: value }]) => [field, value]),
      ) as Prisma.MemberUpdateInput;
      await tx.member.update({ where: { id: change.memberId }, data });
    } else {
      const previousMember =
        defaultInviteDays !== null
          ? await tx.member.findUniqueOrThrow({
              where: { id: change.memberId },
              select: { email: true },
            })
          : null;

      await tx.member.update({
        where: { id: change.memberId },
        data: { email: change.newValue },
      });

      if (defaultInviteDays !== null && previousMember?.email) {
        const openInvite = await tx.invite.findFirst({
          where: {
            email: previousMember.email,
            redeemedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (openInvite) {
          await tx.invite.update({
            where: { id: openInvite.id },
            data: { revokedAt: new Date() },
          });
          const expiresIn = daysToMinutes(defaultInviteDays);
          await tx.invite.create({
            data: {
              token: randomBytes(24).toString("hex"),
              createdByUserId: approverId,
              email: change.newValue,
              expiresIn,
              expiresAt: computeExpiresAt(expiresIn),
            },
          });
        }
      }
    }

    await tx.pendingChange.update({
      where: { id },
      data: { approvedAt: new Date(), approvedByUserId: approverId },
    });
  });

  return { success: true as const };
}

export async function rejectPendingChange(
  id: string,
  approverId: string,
  reason: string,
) {
  const change = await prisma.pendingChange.findUnique({
    where: { id },
    include: { member: { select: { email: true } } },
  });
  if (!change) {
    return { error: "Änderungsantrag nicht gefunden." };
  }
  if (change.approvedAt || change.rejectedAt) {
    return { error: "Über diesen Antrag wurde bereits entschieden." };
  }

  const trimmedReason = reason.trim() || null;
  await prisma.pendingChange.update({
    where: { id },
    data: {
      rejectedAt: new Date(),
      rejectedByUserId: approverId,
      rejectionReason: trimmedReason,
    },
  });

  // Geht an die aktuell hinterlegte E-Mail-Adresse — die neu beantragte ist
  // bei einer Ablehnung ja gerade nicht (mehr) vertrauenswürdig bestätigt.
  await sendPendingChangeRejectedMail(
    change.member.email,
    change.kind,
    trimmedReason,
  );

  return { success: true as const, memberId: change.memberId };
}

export async function listOpenPendingChanges() {
  return prisma.pendingChange.findMany({
    where: { approvedAt: null, rejectedAt: null },
    orderBy: { requestedAt: "asc" },
    include: {
      member: {
        select: {
          id: true,
          email: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          meeple: { select: { displayName: true } },
        },
      },
    },
  });
}
