export type ContactLinks = {
  mailHref: string | null;
  telegramHref: string | null;
  signalHref: string | null;
  /** No reliable "open a chat" URL exists for a bare Discord username (only
   * `discord.com/users/<snowflake-id>`, which we don't have) — shown as a
   * copyable value instead of a link, see `ContactDialog`. */
  discordHandle: string | null;
  /** Only set when the Meeple opted in via `shareAddress` — `address` alone
   * stays private otherwise (see profile-details-form.tsx). */
  address: string | null;
};

/** `telegramHandle`/`signalHandle`/`discordHandle` are assumed already
 * normalised (no leading `@`), see profil actions. */
export function getContactLinks(meeple: {
  email: string | null;
  telegramHandle: string | null;
  signalHandle: string | null;
  discordHandle: string | null;
  address: string | null;
  shareAddress: boolean;
}): ContactLinks {
  return {
    mailHref: meeple.email ? `mailto:${meeple.email}` : null,
    telegramHref: meeple.telegramHandle
      ? `https://t.me/${meeple.telegramHandle}`
      : null,
    signalHref: meeple.signalHandle
      ? `https://signal.me/#eu/${meeple.signalHandle}`
      : null,
    discordHandle: meeple.discordHandle,
    address: meeple.shareAddress ? meeple.address : null,
  };
}
