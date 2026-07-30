"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS, tierAtLeast, type Tier } from "@/lib/utils/nav-config";
import { cn } from "@/lib/utils/cn";

export function Sidebar({ tier }: { tier: Tier }) {
  const pathname = usePathname();
  const groups = NAV_GROUPS.filter((g) => tierAtLeast(tier, g.minTier));
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r px-3 py-6 sm:flex">
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
