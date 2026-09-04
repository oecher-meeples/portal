import { prisma } from "@/lib/utils/prisma";

/**
 * Tägliches Zurücksetzen des "Ich bin da"-Flags (#338, Live-Review-Klärung):
 * `ExplainerAttendance` hat bewusst kein Ablaufdatum und keinen Tagesbezug
 * im Datenmodell (`@@id([eventId, meepleId])`, keine Historie nötig) — der
 * tägliche Reset übernimmt stattdessen die Rolle des Tagesbezugs. Bei einem
 * mehrtägigen Event muss sich ein Erklärbär also jeden Tag neu anmelden,
 * unabhängig vom `endsAt` des Events selbst. Läuft im bestehenden
 * täglichen Cron mit (`api/cron/instagram-queue/route.ts`, 05:00 Uhr,
 * s. `vercel.json`) statt einen eigenen Cron-Slot zu belegen — analog
 * `deleteExpiredLoginLogs()`/`deleteExpiredBankDataAccessLogs()` dort.
 */
export async function resetExplainerAttendance() {
  const { count } = await prisma.explainerAttendance.deleteMany({});
  return { deleted: count };
}
