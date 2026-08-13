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
  PackageSearch,
  UserCog,
  ShoppingBasket,
  Settings,
  Scale,
  GraduationCap,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Breadcrumb label for the section this item belongs to. */
  section: string;
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
        label: "Interner Newsroom",
        href: "/dashboard/news",
        icon: Newspaper,
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
      },
      {
        label: "News & Blog",
        href: "/admin/news",
        icon: Newspaper,
        section: "Administration",
      },
      {
        label: "Bestand & Inventur",
        href: "/admin/bestand",
        icon: Boxes,
        section: "Administration",
      },
      {
        label: "Aufbewahrungseinheiten",
        href: "/admin/einheiten",
        icon: PackageSearch,
        section: "Administration",
      },
      {
        label: "Mitglieder & Einladungen",
        href: "/admin/mitglieder",
        icon: UserCog,
        section: "Administration",
      },
      {
        label: "Beitragseinzug",
        href: "/admin/bank",
        icon: Landmark,
        section: "Administration",
      },
      {
        label: "Events & Schichten",
        href: "/admin/events",
        icon: CalendarClock,
        section: "Administration",
      },
      {
        label: "Bring & Buy Kasse",
        href: "/admin/bringbuy",
        icon: ShoppingBasket,
        section: "Administration",
      },
      {
        label: "Einstellungen",
        href: "/admin/einstellungen",
        icon: Settings,
        section: "Administration",
      },
      {
        label: "Rechtliches-Dokumente",
        href: "/admin/legal",
        icon: Scale,
        section: "Administration",
      },
    ],
  },
];
