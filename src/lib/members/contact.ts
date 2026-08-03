export type ContactLinks = {
  mailHref: string | null;
  telegramHref: string | null;
};

/** `telegramHandle` is assumed already normalised (no leading `@`), see profil actions. */
export function getContactLinks(meeple: {
  email: string | null;
  telegramHandle: string | null;
}): ContactLinks {
  return {
    mailHref: meeple.email ? `mailto:${meeple.email}` : null,
    telegramHref: meeple.telegramHandle
      ? `https://t.me/${meeple.telegramHandle}`
      : null,
  };
}
