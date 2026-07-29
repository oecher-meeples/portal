import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/permissions";
import { ensureMeeple, getMembershipState } from "@/lib/meeples";
import type { Tier } from "@/lib/nav-config";

/** Set by the proxy for every request so guards can reason about the route. */
export const PATHNAME_HEADER = "x-pathname";

/**
 * The only routes an "ausgetreten" Meeple may still reach — settling up:
 * own profile, own holdings, giving games back or on, calendar, member directory.
 * Everything else (Ludothek, interne News, Spielergesuche) is closed.
 */
export const SETTLEMENT_ROUTES: { path: string; exact?: boolean }[] = [
  { path: "/dashboard", exact: true },
  { path: "/dashboard/kalender" },
  { path: "/profil" },
  { path: "/scan" },
  { path: "/mitglieder" },
];

export function isSettlementPath(pathname: string) {
  return SETTLEMENT_ROUTES.some(({ path, exact }) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`),
  );
}

async function currentPathname() {
  return (await headers()).get(PATHNAME_HEADER) ?? "";
}

export async function getSessionTier(): Promise<Tier> {
  const user = await getCurrentUser();
  if (!user) return "gast";
  if (await hasRole(user.id, "admin")) return "admin";
  return "mitglied";
}

/**
 * Guard for every members-only route. Ensures the Meeple exists and enforces
 * the membership state centrally — pages never repeat that rule.
 */
export async function requireMember() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const meeple = await ensureMeeple(user);
  const membershipState = getMembershipState(meeple);

  if (membershipState !== "aktiv" && membershipState !== "gekuendigt") {
    const pathname = await currentPathname();
    if (!isSettlementPath(pathname)) {
      redirect("/403");
    }
  }

  return { user, meeple, membershipState };
}

export async function requireAdmin() {
  const session = await requireMember();
  if (!(await hasRole(session.user.id, "admin"))) {
    redirect("/403");
  }
  return session;
}
