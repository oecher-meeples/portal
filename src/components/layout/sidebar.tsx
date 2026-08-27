"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
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

  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 top-16 left-0 hidden w-64 flex-col gap-2 overflow-y-auto border-r px-3 py-6 sm:flex">
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
                  className="text-sidebar-foreground hover:bg-sidebar-accent flex items-center justify-between rounded-md px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors"
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
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
      <div className="text-sidebar-foreground/60 mt-auto border-t pt-4 text-xs">
        Klickbarer Prototyp &middot; Oecher Meeples
        <br />
        alle Inhalte sind Platzhalter
      </div>
    </aside>
  );
}
