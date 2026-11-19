import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission, type PermissionKey } from "@/lib/auth/permissions";
import {
  ensureMeeple,
  getMeepleMembership,
  type MembershipState,
} from "@/lib/members/meeples";

/**
 * Zentrale Guards für Server Actions (#522). Anders als `requirePermission`
 * prüfen sie zusätzlich den Mitgliedsstatus — dieselbe Regel, die
 * `requireMember()` für Seiten durchsetzt: ein ausgetretenes Mitglied behält
 * Zusatzrollen wie „Vorstand" (`ausgetreten-role.ts`), darf aber nur noch
 * abwickeln (`docs/mitglieder-konzept.md` §3.4). Ohne diesen Check könnte es
 * Actions aufrufen, deren Seiten es abweisen.
 *
 * Drei Rückgabe-Semantiken, je ein Helfer:
 * - `requireActionPermission` — redirect `/login` bzw. `/403`, sonst Actor
 * - `findActionActor` — `null` statt redirect
 * - `actionPermissionDenied` — `{ error }` für Actions mit Ergebnis-Objekt
 */

export type ActionGuardOptions = {
  /**
   * Abwicklungs-Use-Case (eigene Bestände zurückgeben/weitergeben, eigenes
   * Profil): bleibt auch für „ausgetreten" offen. Muss am Aufrufer explizit
   * stehen — der Default sperrt Ausgetretene.
   */
  settlement?: boolean;
};

export type ActionActor = NonNullable<
  Awaited<ReturnType<typeof resolveActionActor>>["actor"]
>;

type PermissionKeys = PermissionKey | readonly PermissionKey[];

function membershipAllows(
  state: MembershipState,
  { settlement = false }: ActionGuardOptions,
) {
  if (state === "registriert" || state === "gekuendigt") return true;
  return settlement && state === "ausgetreten";
}

async function resolveActionActor(
  permissionKeys: PermissionKeys,
  options: ActionGuardOptions,
) {
  const user = await getCurrentUser();
  if (!user) return { denied: "login" as const, actor: null };

  const keys: readonly PermissionKey[] =
    typeof permissionKeys === "string" ? [permissionKeys] : permissionKeys;
  const granted = await Promise.all(
    keys.map((key) => hasPermission(user.id, key)),
  );
  if (!granted.some(Boolean))
    return { denied: "forbidden" as const, actor: null };

  const meeple = await ensureMeeple(user);
  const { member, membershipState } = await getMeepleMembership(meeple);
  if (!membershipAllows(membershipState, options)) {
    return { denied: "forbidden" as const, actor: null };
  }

  return { denied: null, actor: { user, meeple, member, membershipState } };
}

/** Login + mindestens eine der Permissions + aktiver Mitgliedsstatus — sonst redirect. */
export async function requireActionPermission(
  permissionKeys: PermissionKeys,
  options: ActionGuardOptions = {},
): Promise<ActionActor> {
  const { denied, actor } = await resolveActionActor(permissionKeys, options);
  if (denied === "login") redirect("/login");
  if (!actor) redirect("/403");
  return actor;
}

/** Wie `requireActionPermission`, aber `null` statt redirect. */
export async function findActionActor(
  permissionKeys: PermissionKeys,
  options: ActionGuardOptions = {},
): Promise<ActionActor | null> {
  return (await resolveActionActor(permissionKeys, options)).actor;
}

/** Für Actions, die ein Ergebnis-Objekt liefern: `{ error }` bei fehlendem Recht, sonst `null`. */
export async function actionPermissionDenied(
  permissionKeys: PermissionKeys,
  options: ActionGuardOptions = {},
) {
  const actor = await findActionActor(permissionKeys, options);
  return actor ? null : ({ error: "Keine Berechtigung." } as const);
}
