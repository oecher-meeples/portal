import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission, hasRole } from "@/lib/auth/permissions";
import { ensureMeeple, getMembershipState } from "@/lib/members/meeples";
import { TIER_ORDER, type Tier } from "@/lib/utils/nav-config";

/**
 * Admin-only UI preview: lets an admin see the sidebar/nav as another tier
 * would. Never consulted by access-control checks (requireAdmin/requireMember
 * read the real role directly) — display only.
 */
export const PREVIEW_TIER_COOKIE = "preview-tier";

function isTier(value: string | undefined): value is Tier {
  return !!value && (TIER_ORDER as string[]).includes(value);
}

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
    exact
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

async function currentPathname() {
  return (await headers()).get(PATHNAME_HEADER) ?? "";
}

export async function getRealSessionTier(): Promise<Tier> {
  const user = await getCurrentUser();
  if (!user) return "gast";
  if (await hasRole(user.id, "admin")) return "admin";
  return "mitglied";
}

/** The admin's chosen preview tier, if any — only ever set for real admins. */
export async function getPreviewTier(): Promise<Tier | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PREVIEW_TIER_COOKIE)?.value;
  return isTier(value) ? value : null;
}

/**
 * Effective tier for display purposes — real role, overridden by an admin's
 * preview choice. Admins default to "mitglied" until they explicitly pick a
 * tier via the switcher (including picking "admin" itself, which stores that
 * choice rather than falling back to it).
 */
export async function getSessionTier(): Promise<Tier> {
  const realTier = await getRealSessionTier();
  if (realTier !== "admin") return realTier;
  return (await getPreviewTier()) ?? "mitglied";
}

/**
 * Permission check for UI affordances shown on non-admin pages (e.g. an edit
 * button on a public post). Unlike `hasPermission` this also hides while an
 * admin is previewing a non-admin tier — real access control never calls
 * this. Only ever adjusts the result for real admins: `getPreviewTier()`
 * presence alone isn't the signal (the cookie can legitimately hold
 * `"admin"` itself, see `getSessionTier`), and a moderator/kassenwart's own
 * permissions must never be tier-gated — they have no "admin" tier at all.
 */
export async function hasPermissionInCurrentView(
  userId: string,
  permissionKey: string,
) {
  if (await hasRole(userId, "admin")) {
    const previewTier = (await getPreviewTier()) ?? "mitglied";
    if (previewTier !== "admin") return false;
  }
  return hasPermission(userId, permissionKey);
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
