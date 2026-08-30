import { prisma } from "@/lib/utils/prisma";
import { collectMeeplePersonalData } from "@/lib/members/data-export";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";

export type SendSelbstauskunftResult = { error: string } | { success: true };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!,
  );
}

function selbstauskunftHtml(displayName: string, data: unknown): string {
  return [
    `<p>Hallo ${escapeHtml(displayName)},</p>`,
    "<p>anbei deine Selbstauskunft nach Art. 15/20 DSGVO, angestoßen von einem Vereinsadmin.</p>",
    '<pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;">' +
      escapeHtml(JSON.stringify(data, null, 2)) +
      "</pre>",
  ].join("\n");
}

/**
 * Admin-triggered Art.-15/20-Auskunft an die beim Mitglied hinterlegte
 * E-Mail-Adresse. Nutzt dieselbe Datensammlung wie der Selbstbedienungs-Export
 * im Profil (collectMeeplePersonalData) — ein zweiter Satz Auskunftsdaten
 * wäre ein DSGVO-Konsistenzrisiko.
 *
 * Does *not* check permissions — that is the caller's job.
 */
export async function sendSelbstauskunftMail(
  meepleId: string,
): Promise<SendSelbstauskunftResult> {
  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple) return { error: "Mitglied nicht gefunden." };

  // Die E-Mail-Adresse lebt seit #328 auf dem verknüpften Vereinsmitglied.
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { email: true },
  });
  if (!member?.email) {
    return {
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    };
  }

  const data = await collectMeeplePersonalData(meepleId);
  if (!data)
    return { error: "Zu diesem Mitglied wurden keine Daten gefunden." };

  try {
    await sendTransactionalEmail({
      to: member.email,
      subject: "Deine Selbstauskunft (Art. 15/20 DSGVO)",
      html: selbstauskunftHtml(meeple.displayName, data),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Der Versand der Selbstauskunft ist fehlgeschlagen.",
    };
  }

  return { success: true };
}
