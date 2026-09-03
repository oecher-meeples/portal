"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Pin, PinOff } from "lucide-react";
import {
  NAV_GROUPS,
  tierAtLeast,
  type NavFlag,
  type NavGroup,
  type NavItem,
  type Tier,
} from "@/lib/utils/nav-config";
import { cn } from "@/lib/utils/cn";

/**
 * Whether a nav item should show for this user. Items with a `permission`
 * (currently only Administration entries) are gated by permission instead
 * of tier, so e.g. a Kassenwart (tier "mitglied") still sees "Beitragseinzug".
 * `previewingLowerTier` (a real admin previewing as mitglied/gast) still
 * hides them — the preview switcher must show exactly what that tier sees.
 */
/** Persistiert, ob der Meeple die auf `md`–`lg` sonst nur bei Hover/Fokus
 * ausklappende Sidebar (#336) dauerhaft in voller Breite fixiert hat.
 * Client-seitig only — kein Server-State nötig. */
const PINNED_STORAGE_KEY = "sidebar-pinned";

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

export function Sidebar({
  tier,
  realTier,
  permissions,
  flags,
}: {
  tier: Tier;
  realTier: Tier;
  permissions: readonly string[];
  flags: Readonly<Record<NavFlag, boolean>>;
}) {
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const previewingLowerTier = realTier === "admin" && tier !== "admin";
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      isItemVisible(
        item,
        group,
        tier,
        permissionSet,
        previewingLowerTier,
        flags,
      ),
    ),
  })).filter((group) => group.items.length > 0);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  // Icon-only-Breite auf md–lg (#336): Hover/Fokus klappt per CSS
  // (group-hover/group-focus-within) auf volle Breite auf, als Overlay über
  // dem Content — AppShell verschiebt dafür nichts. Der Pin fixiert das
  // zusätzlich dauerhaft, für Touch-Geräte ohne Hover.
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PINNED_STORAGE_KEY) === "1");
    } catch {
      // localStorage kann in Private-Mode/blockiertem Storage werfen —
      // dann bleibt der Pin einfach ungesetzt.
    }
  }, []);
  function togglePinned() {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // s. o.
      }
      return next;
    });
  }

  // Nur sichtbar/lesbar, wenn die Sidebar tatsächlich ausgeklappt ist:
  // dauerhaft ab xl, sonst bei Pin, Hover oder Tastatur-Fokus auf md–lg.
  const expandedFlex = cn(
    "hidden xl:flex",
    "md:group-hover:flex md:group-focus-within:flex",
    pinned && "md:flex",
  );
  const expandedInline = cn(
    "hidden xl:inline",
    "md:group-hover:inline md:group-focus-within:inline",
    pinned && "md:inline",
  );
  const PinIcon = pinned ? PinOff : Pin;

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground group fixed inset-y-0 top-16 left-0 z-20 hidden flex-col gap-2 overflow-x-hidden overflow-y-auto border-r px-3 py-6 transition-[width] duration-150 md:flex md:w-16 xl:w-64",
        !pinned && "md:hover:w-64 md:focus-within:w-64",
        pinned && "md:w-64",
      )}
    >
      <button
        type="button"
        onClick={togglePinned}
        className={cn(
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors xl:hidden",
          pinned && "bg-sidebar-primary/15 text-sidebar-foreground",
        )}
      >
        <PinIcon className="size-4 shrink-0" />
        <span className={expandedInline}>
          {pinned ? "Angeheftet" : "Anheften"}
        </span>
      </button>
      <nav className="flex flex-col gap-2">
        {groups.map((group, index) => {
          const key = group.title ?? "root";
          const isCollapsed = collapsedGroups[key];

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col gap-1",
                group.title &&
                  index > 0 &&
                  "border-sidebar-border mt-2 border-t pt-3",
              )}
            >
              {group.title && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                  className={cn(
                    "text-sidebar-foreground hover:bg-sidebar-accent w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors",
                    expandedFlex,
                  )}
                >
                  {group.title}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>
              )}
              {!isCollapsed &&
                group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary/15 text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className={expandedInline}>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
      <div
        className={cn(
          "text-sidebar-foreground/60 mt-auto border-t pt-4 text-xs",
          expandedFlex,
          "flex-col",
        )}
      >
        Klickbarer Prototyp &middot; Oecher Meeples
        <br />
        alle Inhalte sind Platzhalter
      </div>
    </aside>
  );
}
