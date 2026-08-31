import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentSession, getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { logAdminLoginOnce } from "@/lib/auth/login-log";
import { ensureMeeple, getMembershipState } from "@/lib/members/meeples";
import { TIER_ORDER, type Tier } from "@/lib/utils/nav-config";

/**
 * Admin-only UI preview: lets an admin see the sidebar/nav as another tier
 * would. Never consulted by access-control checks (requireAdmin/requireMember
 * read the real permission directly) — display only.
 */
export const PREVIEW_TIER_COOKIE = "preview-tier";

/**
 * Grants the "admin" tier — a permission, not a role name. Deliberately not
 * tied to any specific Role.name: which role(s) grant it is purely a
 * RolePermission-Zuordnung, die in der Rollenverwaltung (#216) frei
 * umbenannt/umstrukturiert werden kann, ohne diesen Zugriff lautlos zu
 * entziehen (siehe #219-Review — genau das ist vorher mit der alten
 * hasRole(userId, "admin")-Prüfung passiert).
 */
const ADMIN_ACCESS_PERMISSION = "admin:access";

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
  if (await hasPermission(user.id, ADMIN_ACCESS_PERMISSION)) return "admin";
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
  if (await hasPermission(userId, ADMIN_ACCESS_PERMISSION)) {
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
  // resignedAt/membershipEndsAt moved to the linked Member (#328) —
  // anonymizedAt stays on Meeple.
  const member = await prisma.member.findUnique({
    where: { meepleId: meeple.id },
    select: { resignedAt: true, membershipEndsAt: true },
  });
  const membershipState = getMembershipState({
    resignedAt: member?.resignedAt ?? null,
    membershipEndsAt: member?.membershipEndsAt ?? null,
    anonymizedAt: meeple.anonymizedAt,
  });

  if (membershipState !== "aktiv" && membershipState !== "gekuendigt") {
    const pathname = await currentPathname();
    if (!isSettlementPath(pathname)) {
      redirect("/403");
    }
  }

  return { user, meeple, membershipState };
}

/**
 * Zwangs-Logout für `admin:access`-Konten (#231): keine langlebige,
 * still weiterlaufende Session — nach 12h ab Login (`session.createdAt`,
 * unabhängig von fortgesetzter Aktivität) wird eine erneute Anmeldung
 * verlangt. Der eigentliche Cookie-Löschvorgang läuft über einen Redirect
 * auf einen Route Handler (`/api/auth/force-logout`), weil Server
 * Components selbst keine Cookies schreiben dürfen (#242).
 *
 * Bewusst hier statt in `src/proxy.ts` verankert: `auth.getSession()`
 * braucht den `next/headers`-Request-Context, den Middleware nicht hat —
 * dieser Check greift dafür bei jedem Zugriff auf eine `/admin`-Seite,
 * was für ein praktisch admin-only genutztes Konto ausreicht.
 */
const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function enforceAdminAccessSessionFreshness(neonAuthUserId: string) {
  if (!(await hasPermission(neonAuthUserId, ADMIN_ACCESS_PERMISSION))) return;

  const session = await getCurrentSession();
  if (!session) return;

  await logAdminLoginOnce(neonAuthUserId, session.session.createdAt);

  const ageMs = Date.now() - session.session.createdAt.getTime();
  if (ageMs > ADMIN_SESSION_MAX_AGE_MS) {
    const pathname = await currentPathname();
    redirect(
      `/api/auth/force-logout?next=${encodeURIComponent(`/login?next=${pathname}`)}`,
    );
  }
}

/**
 * Guard for an admin-area route gated by one or more specific permissions
 * (any match is enough) — unlike `requirePermission` this also enforces the
 * membership-state check from `requireMember`, matching `requireAdmin`'s
 * behaviour. Use this instead of `requireAdmin` wherever a route only needs
 * one feature permission (e.g. `games:manage`), so a Spielewart/Kassenwart/
 * Redakteur etc. can reach it without also holding `admin:access`.
 */
export async function requireAdminPermission(permissionKey: string | string[]) {
  const session = await requireMember();
  await enforceAdminAccessSessionFreshness(session.user.id);

  const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  const results = await Promise.all(
    keys.map((key) => hasPermission(session.user.id, key)),
  );
  if (!results.some(Boolean)) {
    redirect("/403");
  }
  return session;
}

export async function requireAdmin() {
  return requireAdminPermission(ADMIN_ACCESS_PERMISSION);
}
