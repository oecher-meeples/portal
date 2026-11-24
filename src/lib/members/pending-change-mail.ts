import { PendingChangeKind } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import { escapeHtml } from "@/lib/utils/escape-html";

/** Shared with the invite-link builder's plain-string convention (no
 * `new URL()`) so an empty `origin` (SSR) still yields a valid relative link. */
export function buildEmailChangeConfirmationLink(
  origin: string,
  token: string,
): string {
  return `${origin}/profil/e-mail-bestaetigen?token=${encodeURIComponent(token)}`;
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
      "<p>Danach geht dein Änderungsantrag an den Vorstand. Sobald er freigegeben ist, bekommst du eine weitere Mail an diese Adresse — erst dann gilt sie für Login und Vereinskontakt.</p>",
    ].join("\n"),
  });
}

/** Warnung an die bisherige Adresse beim Antrag (#614) — fällt ein fremder
 * Antrag auf, bleibt bis zur Vorstandsfreigabe Zeit zu reagieren. */
export async function sendEmailChangeRequestedNoticeMail(
  currentEmail: string,
  newEmail: string,
) {
  await sendTransactionalEmail({
    to: currentEmail,
    subject: "Änderung deiner E-Mail-Adresse beantragt",
    html: [
      "<p>Hallo,</p>",
      `<p>für dein Konto im Oecher-Meeples-Portal wurde eine Änderung der E-Mail-Adresse auf <strong>${escapeHtml(newEmail)}</strong> beantragt. Sie wird erst wirksam, wenn der Bestätigungslink an die neue Adresse geklickt und die Änderung vom Vorstand freigegeben wurde.</p>`,
      "<p>Falls du das nicht warst, ändere bitte dein Passwort und wende dich an den Vorstand.</p>",
    ].join("\n"),
  });
}

/** Nach der Vorstandsfreigabe (#614) — an die neue Adresse, die ab jetzt
 * Login- und Vereinsmitglied-E-Mail zugleich ist. */
export async function sendEmailChangeAppliedMail(newEmail: string) {
  await sendTransactionalEmail({
    to: newEmail,
    subject: "Deine neue E-Mail-Adresse ist jetzt aktiv",
    html: [
      "<p>Hallo,</p>",
      "<p>der Vorstand hat deine Änderung freigegeben: Diese E-Mail-Adresse ist ab sofort deine Adresse im Oecher-Meeples-Portal — für den Login und für alle Vereinsmitteilungen.</p>",
      "<p>Deine bisherige Adresse ist damit ungültig. Melde dich bitte ab jetzt mit dieser Adresse an.</p>",
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
