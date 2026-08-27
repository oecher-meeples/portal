import {
  Home,
  Newspaper,
  CalendarDays,
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
};

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
 * Every permission that unlocks at least one Administration nav item —
 * mirrors the `permission` field below. Also used as the required
 * permission set for "Mitglieder & Einladungen" and "Einstellungen", which
 * host more than one distinct permission, and as the required set for the
 * Admin-Dashboard, which is the landing page for the whole area (see
 * requireAdminPermission calls in the matching admin/*​/page.tsx files —
 * keep those in sync with this list).
 */
export const ADMIN_PERMISSIONS = [
  "posts:write",
  "games:manage",
  "members:manage",
  "invites:manage",
  "bank:read",
  "events:manage",
  "instagram:connect",
] as const;

export const MITGLIEDER_PERMISSIONS = ["members:manage", "invites:manage"];
export const EINSTELLUNGEN_PERMISSIONS = ["games:manage", "instagram:connect"];

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
        minTier: "mitglied",
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
        label: "Vereinskalender",
        href: "/dashboard/kalender",
        icon: CalendarDays,
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
      },
      {
        label: "Ausleihe & Rückgabe",
        href: "/ausleihe",
        icon: PackageOpen,
        section: "Mitgliederbereich",
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
        permission: "posts:write",
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
        permission: "games:manage",
      },
      {
        label: "Event-Rückgabe",
        href: "/admin/bestand/event-rueckgabe",
        icon: Boxes,
        section: "Administration",
        permission: "games:manage",
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
