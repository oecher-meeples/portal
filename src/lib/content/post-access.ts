/**
 * `posts:write` wurde in zwei Rechte aufgesplittet (#321): `posts:public`
 * für öffentliche, `posts:internal` für interne Beiträge. Wer beide hat,
 * sieht/bearbeitet alles. Reine Logik ohne Server-Imports — auch aus
 * Client-Komponenten nutzbar (siehe `post-permissions.ts` für die
 * Server-seitigen Loader/Guards, die diese Typen verwenden).
 */
export type PostPermissions = {
  canEditPublic: boolean;
  canEditInternal: boolean;
};

/** Welches der beiden Rechte ein Beitrag mit diesem `internal`-Wert verlangt. */
export function canManagePostType(
  perms: PostPermissions,
  internal: boolean | null | undefined,
): boolean {
  return internal ? perms.canEditInternal : perms.canEditPublic;
}
