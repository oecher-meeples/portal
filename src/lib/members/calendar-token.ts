import { createHash } from "node:crypto";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getMembershipState } from "@/lib/members/membership-state";
import { generateToken } from "@/lib/utils/generate-token";
import { siteUrl } from "@/lib/utils/site-url";

/** Abo-URL zu einem Roh-Token — `.ics`-Suffix für Kalender-Apps, die es zur
 * Erkennung brauchen (siehe `/api/calendar/internal/[token]`). */
export function calendarSubscribeUrl(token: string): string {
  return `${siteUrl()}/api/calendar/internal/${token}.ics`;
}

/** #439: ob das Mitglied hinter einem Login schon einen Abo-Token hat —
 * `/news` fragt vor dem Self-Service-Erzeugen nach, weil ein neuer Token das
 * bisherige Abo ungültig macht. */
export async function hasOwnCalendarToken(
  neonAuthUserId: string,
): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { meeple: { neonAuthUserId } },
    select: { calendarTokenHash: true },
  });
  return member?.calendarTokenHash != null;
}

/**
 * Personalisierter Abo-Token für den internen ICS-Kalender-Feed (#438).
 * Anders als andere Link-Token in diesem Projekt (Invite, Newsletter-
 * Manage-Token, Bring&Buy-externer-Verkäufer — alle im Klartext in der DB)
 * wird hier nur der SHA-256-Hash gespeichert: ein Google-Calendar-Secret-
 * Link ist dauerhaft gültig und nicht per Session widerrufbar, dieser
 * Abo-Link soll dieselbe Klasse an Langlebigkeit nicht durch einen DB-Leak
 * kompromittierbar machen. Der Rohwert existiert dadurch nur einmalig im
 * Rückgabewert von `generateMemberCalendarToken()` — der Aufrufer zeigt ihn
 * an oder verschickt ihn per Mail, er wird nirgends persistiert.
 */
export function hashCalendarToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Erzeugt einen neuen Token und ersetzt einen eventuell bestehenden — genau
 * ein aktiver Token pro Mitglied, das alte Abo funktioniert danach nicht
 * mehr (kein Vorhalten mehrerer gültiger Token). Gibt den Rohwert zurück,
 * der nirgends sonst wiederbeschaffbar ist. */
export async function generateMemberCalendarToken(
  memberId: string,
): Promise<string> {
  const token = generateToken();
  await prisma.member.update({
    where: { id: memberId },
    data: {
      calendarTokenHash: hashCalendarToken(token),
      calendarTokenCreatedAt: new Date(),
    },
  });
  return token;
}

/** Macht ein bestehendes Abo dauerhaft ungültig, ohne einen neuen Token zu erzeugen. */
export async function revokeMemberCalendarToken(memberId: string) {
  await prisma.member.update({
    where: { id: memberId },
    data: { calendarTokenHash: null, calendarTokenCreatedAt: null },
  });
}

/** Löst einen Roh-Token aus der Abo-URL gegen ein Mitglied auf — `null` bei
 * unbekanntem oder bereits widerrufenem Token. Kein Login-Cookie im Spiel:
 * der Abruf kommt von der Kalender-App selbst im Hintergrund.
 *
 * Der Token allein reicht nicht: wie bei den Action-Guards (#522) muss das
 * Mitglied aktiv sein (nicht ausgetreten/anonymisiert) und `news:internal:view`
 * noch besitzen. Sonst behielte ein gesperrtes Mitglied dauerhaft Zugriff auf
 * den internen Kalender, obwohl der Admin ihm die Berechtigung entzogen hat. */
export async function resolveMemberByCalendarToken(token: string) {
  const member = await prisma.member.findUnique({
    where: { calendarTokenHash: hashCalendarToken(token) },
    select: {
      id: true,
      meepleId: true,
      resignedAt: true,
      membershipEndsAt: true,
      meeple: { select: { neonAuthUserId: true, anonymizedAt: true } },
    },
  });
  if (!member?.meeple?.neonAuthUserId) return null;

  const state = getMembershipState({
    meepleId: member.meepleId,
    resignedAt: member.resignedAt,
    membershipEndsAt: member.membershipEndsAt,
    anonymizedAt: member.meeple.anonymizedAt,
  });
  if (state !== "registriert" && state !== "gekuendigt") return null;

  const allowed = await hasPermission(
    member.meeple.neonAuthUserId,
    "news:internal:view",
  );
  return allowed ? { id: member.id } : null;
}
