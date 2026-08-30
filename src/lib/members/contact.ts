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

/**
 * A Meeple no longer carries `email` directly — it moved to the linked
 * `Member` (#328). Every contact-surface query joins `member: { select:
 * { email: true } }` and flattens it back with this helper before calling
 * `getContactLinks`, so the join stays in one place instead of repeated
 * per call site.
 */
export function meepleEmail(meeple: {
  member: { email: string | null } | null;
}): string | null {
  return meeple.member?.email ?? null;
}

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
