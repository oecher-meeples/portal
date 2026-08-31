import { PendingChangeKind } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!,
  );
}

/** Shared with the invite-link builder's plain-string convention (no
 * `new URL()`) so an empty `origin` (SSR) still yields a valid relative link. */
export function buildEmailChangeConfirmationLink(
  origin: string,
  token: string,
): string {
  return `${origin}/mitglied/e-mail-bestaetigen?token=${encodeURIComponent(token)}`;
}

export async function sendEmailChangeConfirmationMail(
  newEmail: string,
  confirmLink: string,
) {
  await sendTransactionalEmail({
    to: newEmail,
    subject: "Bitte bestätige deine neue E-Mail-Adresse",
    html: [
      "<p>Hallo,</p>",
      "<p>bitte bestätige, dass diese E-Mail-Adresse erreichbar ist, indem du auf den folgenden Link klickst:</p>",
      `<p><a href="${escapeHtml(confirmLink)}">${escapeHtml(confirmLink)}</a></p>`,
      "<p>Die Änderung wird danach zusätzlich vom Vorstand freigegeben, bevor sie wirksam wird.</p>",
    ].join("\n"),
  });
}

const KIND_LABELS: Record<PendingChangeKind, string> = {
  [PendingChangeKind.IBAN]: "IBAN-Änderung",
  [PendingChangeKind.MEMBER_EMAIL]: "E-Mail-Änderung",
  [PendingChangeKind.MEMBER_STAMMDATEN]: "Stammdaten-Änderung",
};

export async function sendPendingChangeRejectedMail(
  // `null` seit #373 (MiniMeeple ohne eigene E-Mail) — dessen
  // Stammdaten-Anträge stellt ein:e Erziehungsberechtigte:r, die Ablehnung
  // hat dann schlicht keinen Zustellweg und wird stillschweigend übersprungen.
  memberEmail: string | null,
  kind: PendingChangeKind,
  reason: string | null,
) {
  if (!memberEmail) return;

  await sendTransactionalEmail({
    to: memberEmail,
    subject: `Dein Änderungsantrag wurde abgelehnt (${KIND_LABELS[kind]})`,
    html: [
      "<p>Hallo,</p>",
      `<p>dein Antrag „${escapeHtml(KIND_LABELS[kind])}“ wurde abgelehnt.</p>`,
      reason
        ? `<p>Begründung: ${escapeHtml(reason)}</p>`
        : "<p>Es wurde keine Begründung angegeben — wende dich bei Fragen an den Vorstand.</p>",
    ].join("\n"),
  });
}
