import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import { escapeHtml } from "@/lib/utils/escape-html";
import { siteUrl } from "@/lib/utils/site-url";
import {
  buildRegistrationLink,
  formatInviteMessage,
  INVITE_MAIL_SUBJECT,
} from "@/lib/members/invite-format";

/** Plain text of `formatInviteMessage` as HTML — same wording as the
 * "Einladung kopieren"/`mailto:` fallback, with the link made clickable. */
function inviteMailHtml(link: string, expiresAt: Date): string {
  const escapedLink = escapeHtml(link);
  return escapeHtml(formatInviteMessage(link, expiresAt))
    .split("\n\n")
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replace(
            escapedLink,
            () => `<a href="${escapedLink}">${escapedLink}</a>`,
          )
          .replaceAll("\n", "<br>")}</p>`,
    )
    .join("\n");
}

/** Sends the registration link of a bound invite to its email (#613).
 * Returns the error message instead of throwing, so a mail failure never
 * undoes the invite itself — the admin can still copy the link. `null` =
 * sent. */
export async function sendInviteMail(invite: {
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<string | null> {
  const link = buildRegistrationLink(siteUrl(), invite.token, invite.email);
  try {
    await sendTransactionalEmail({
      to: invite.email,
      subject: INVITE_MAIL_SUBJECT,
      html: inviteMailHtml(link, invite.expiresAt),
    });
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Der Versand ist fehlgeschlagen.";
  }
}
