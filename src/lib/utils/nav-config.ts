import {
  Home,
  Newspaper,
  HeartHandshake,
  FileText,
  LayoutDashboard,
  Dice5,
  ScanLine,
  Users,
  ShieldCheck,
  Tag,
  UserCircle,
  BarChart3,
  ChartNoAxesCombined,
  Boxes,
  Landmark,
  UserCog,
  ShoppingBasket,
  Settings,
  GraduationCap,
  CalendarClock,
  HandHeart,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Breadcrumb label for the section this item belongs to. */
  section: string;
  /** Overrides the group's minTier for this one item (e.g. #96). */
  minTier?: Tier;
  /**
   * Permission key(s) required to see this item (any match is enough).
   * Used for Administration items so e.g. a Redakteur/Kassenwart/Spielewart
   * sees only the entries their role grants, instead of the coarse "admin"
   * tier gating the whole group. Overrides minTier when set — an admin
   * previewing a lower tier still hides these (see sidebar.tsx).
   */
  permission?: string | string[];
  /**
   * Extra data-dependent visibility gate on top of tier/permission —
   * "openHelperRequest" (#155, event-wide): hides "Helferplan" unless a
   * future event has `Event.helpersWanted` set. "activeAusleiheShift"
   * (#433, per Nutzer): hides "Ausleihe & Rückgabe" unless the current
   * Meeple is inside a currently active "Leihe"-Schichtbuchung. Resolved
   * server-side in app-shell.tsx and passed to Sidebar; direct navigation to
   * the href itself stays reachable regardless (the page shows its own
   * empty state / 403).
   */
  requiresFlag?: NavFlag;
};

export type NavFlag = "openHelperRequest" | "activeAusleiheShift";

export type Tier = "gast" | "mitglied" | "admin";

export type NavGroup = {
  title: string | null;
  minTier: Tier;
  items: NavItem[];
};

export const TIER_ORDER: Tier[] = ["gast", "mitglied", "admin"];

export function tierAtLeast(current: Tier, minTier: Tier) {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(minTier);
}

/**
 * Whether a nav item should show for this user. Items with a `permission`
 * (currently only Administration entries) are gated by permission instead
 * of tier, so e.g. a Kassenwart (tier "mitglied") still sees "Beitragseinzug".
 * `previewingLowerTier` (a real admin previewing as mitglied/gast) still
 * hides them — the preview switcher must show exactly what that tier sees.
 */
function isItemVisible(
  item: NavItem,
  group: NavGroup,
  tier: Tier,
  permissions: ReadonlySet<string>,
  previewingLowerTier: boolean,
  flags: Readonly<Record<NavFlag, boolean>>,
) {
  if (item.requiresFlag && !flags[item.requiresFlag]) return false;
  if (item.permission) {
    if (previewingLowerTier) return false;
    if (permissions.has("admin:access")) return true;
    const required = Array.isArray(item.permission)
      ? item.permission
      : [item.permission];
    return required.some((key) => permissions.has(key));
  }
  return tierAtLeast(tier, item.minTier ?? group.minTier);
}

/**
 * `NAV_GROUPS`, gefiltert auf das, was dieser Nutzer sieht — einzige
 * Quelle der Wahrheit für Sidebar (Desktop) *und* MobileNav (#437), damit
 * beide garantiert dieselben Einträge zeigen. Gruppen ohne sichtbare
 * Einträge fallen komplett weg.
 */
export function getVisibleNavGroups(
  tier: Tier,
  permissions: ReadonlySet<string>,
  previewingLowerTier: boolean,
  flags: Readonly<Record<NavFlag, boolean>>,
): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      isItemVisible(item, group, tier, permissions, previewingLowerTier, flags),
    ),
  })).filter((group) => group.items.length > 0);
}

/**
 * Every permission that unlocks at least one Administration nav item —
 * mirrors the `permission` field below. Also used as the required
 * permission set for "Mitglieder & Einladungen" and "Einstellungen", which
 * host more than one distinct permission, and as the required set for the
 * Admin-Dashboard, which is the landing page for the whole area (see
 * requireAdminPermission calls in the matching admin/*​/page.tsx files —
 * keep those in sync with this list).
 */
export const ADMIN_PERMISSIONS = [
  "posts:public",
  "posts:internal",
  "games:manage",
  "members:manage",
  "invites:manage",
  "bank:read",
  "events:manage",
  "events:bestand",
  "instagram:connect",
] as const;

export const MITGLIEDER_PERMISSIONS = ["members:manage", "invites:manage"];
export const EINSTELLUNGEN_PERMISSIONS = [
  "games:manage",
  "instagram:connect",
  "invites:manage",
  // #388: T-Shirt-Größen-Verwaltung braucht Seitenzugriff für den Vorstand,
  // auch ohne eine der drei anderen Berechtigungen.
  "members:manage",
];

/** Icon je NAV_GROUPS-Gruppe für die mobile Bottom-Bar (#437), geschlüsselt
 * wie `sidebar.tsx`s `collapsedGroups` (`group.title ?? "root"`). */
export const NAV_GROUP_ICONS: Record<string, LucideIcon> = {
  root: Home,
  Mitgliederbereich: Users,
  Administration: Settings,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    minTier: "gast",
    items: [
      { label: "Startseite", href: "/", icon: Home, section: "Öffentlich" },
      {
        label: "Termine & Blog",
        href: "/news",
        icon: Newspaper,
        section: "Öffentlich",
      },
      {
        label: "Support & Spenden",
        href: "/spenden",
        icon: HeartHandshake,
        section: "Öffentlich",
      },
      {
        label: "Downloads & Rechtliches",
        href: "/downloads",
        icon: FileText,
        section: "Öffentlich",
      },
      {
        label: "Ludothek",
        href: "/ludothek",
        icon: Dice5,
        section: "Öffentlich",
      },
    ],
  },
  {
    title: "Mitgliederbereich",
    minTier: "mitglied",
    items: [
      {
        label: "Mein Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        section: "Mitgliederbereich",
      },
      {
        label: "QR-/EAN-Scan",
        href: "/scan",
        icon: ScanLine,
        section: "Mitgliederbereich",
      },
      {
        label: "Spielergesuche",
        href: "/lfg",
        icon: Users,
        section: "Mitgliederbereich",
      },
      {
        label: "Helferplan",
        href: "/helfer",
        icon: ShieldCheck,
        section: "Mitgliederbereich",
        requiresFlag: "openHelperRequest",
      },
      {
        label: "Ausleihe & Rückgabe",
        href: "/ausleihe",
        icon: PackageOpen,
        section: "Mitgliederbereich",
        requiresFlag: "activeAusleiheShift",
      },
      {
        label: "Erklärbären",
        href: "/erklaerbaeren",
        icon: GraduationCap,
        section: "Mitgliederbereich",
      },
      {
        label: "Markt & Ersatzteile",
        href: "/markt",
        icon: Tag,
        section: "Mitgliederbereich",
      },
      {
        label: "Statistiken",
        href: "/statistiken",
        icon: ChartNoAxesCombined,
        section: "Mitgliederbereich",
      },
      {
        label: "Mein Profil",
        href: "/profil",
        icon: UserCircle,
        section: "Mitgliederbereich",
      },
    ],
  },
  {
    title: "Administration",
    minTier: "admin",
    items: [
      {
        label: "Admin-Dashboard",
        href: "/admin",
        icon: BarChart3,
        section: "Administration",
        permission: [...ADMIN_PERMISSIONS],
      },
      {
        label: "News & Blog",
        href: "/admin/news",
        icon: Newspaper,
        section: "Administration",
        permission: ["posts:public", "posts:internal"],
      },
      {
        label: "Bestand & Inventur",
        href: "/admin/bestand",
        icon: Boxes,
        section: "Administration",
        permission: "games:manage",
      },
      {
        label: "Ausleihen",
        href: "/admin/bestand/ausleihen",
        icon: HandHeart,
        section: "Administration",
        permission: "games:manage",
      },
      {
        label: "Event-Ausgabe",
        href: "/admin/bestand/event-ausgabe",
        icon: Boxes,
        section: "Administration",
        permission: "events:bestand",
      },
      {
        label: "Event-Rückgabe",
        href: "/admin/bestand/event-rueckgabe",
        icon: Boxes,
        section: "Administration",
        permission: "events:bestand",
      },
      {
        label: "Mitglieder & Einladungen",
        href: "/admin/mitglieder",
        icon: UserCog,
        section: "Administration",
        permission: MITGLIEDER_PERMISSIONS,
      },
      {
        label: "Beitragseinzug",
        href: "/admin/bank",
        icon: Landmark,
        section: "Administration",
        permission: "bank:read",
      },
      {
        label: "Events & Schichten",
        href: "/admin/events",
        icon: CalendarClock,
        section: "Administration",
        permission: "events:manage",
      },
      {
        label: "Bring & Buy Kasse",
        href: "/admin/bringbuy",
        icon: ShoppingBasket,
        section: "Administration",
        permission: "events:manage",
      },
      {
        label: "Einstellungen",
        href: "/admin/einstellungen",
        icon: Settings,
        section: "Administration",
        permission: EINSTELLUNGEN_PERMISSIONS,
      },
    ],
  },
];
