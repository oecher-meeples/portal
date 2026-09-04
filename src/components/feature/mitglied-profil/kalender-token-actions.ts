"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  generateMemberCalendarToken,
  revokeMemberCalendarToken,
} from "@/lib/members/calendar-token";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";

async function revalidateProfile(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { slug: true },
  });
  revalidatePath(`/profil/${member.slug}`);
}

function subscribeUrl(token: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? "";
  return `${base}/api/calendar/internal/${token}.ics`;
}

/** Erzeugt einen neuen Abo-Token und ersetzt einen eventuell bestehenden
 * (#438) — nur `admin:access`. Die Abo-URL geht als Rückgabewert einmalig an
 * den Client, nirgends persistiert (nur der Hash liegt in der DB). */
export async function generateMemberCalendarSubscription(memberId: string) {
  await requirePermission("admin:access");

  const token = await generateMemberCalendarToken(memberId);
  await revalidateProfile(memberId);
  return { success: true as const, subscribeUrl: subscribeUrl(token) };
}

export async function revokeMemberCalendarSubscription(memberId: string) {
  await requirePermission("admin:access");

  await revokeMemberCalendarToken(memberId);
  await revalidateProfile(memberId);
  return { success: true as const };
}

/** Erzeugt (rotiert) einen Token und verschickt die Abo-URL direkt per Mail
 * — ein Roh-Token ist nach dem Erzeugen nicht mehr abrufbar, "erneut
 * versenden" muss also immer neu erzeugen. */
export async function sendMemberCalendarSubscriptionMail(memberId: string) {
  await requirePermission("admin:access");

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { email: true, meeple: { select: { displayName: true } } },
  });
  if (!member?.email) {
    return {
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    };
  }

  const token = await generateMemberCalendarToken(memberId);
  const url = subscribeUrl(token);
  const displayName = member.meeple?.displayName ?? "Mitglied";

  try {
    await sendTransactionalEmail({
      to: member.email,
      subject: "Dein interner Vereinskalender zum Abonnieren",
      html: [
        `<p>Hallo ${displayName},</p>`,
        "<p>mit diesem persönlichen Link kannst du den internen Vereinskalender in deiner Kalender-App abonnieren:</p>",
        `<p><a href="${url}">${url}</a></p>`,
        "<p>Der Link ist nur für dich bestimmt — bitte nicht weitergeben. Bei Bedarf kann er im Vereinsportal jederzeit widerrufen werden.</p>",
      ].join("\n"),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Der Versand ist fehlgeschlagen.",
    };
  }

  await revalidateProfile(memberId);
  return { success: true as const };
}
