"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, tierAtLeast, type Tier } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ tier }: { tier: Tier }) {
  const pathname = usePathname();
  const groups = NAV_GROUPS.filter((g) => tierAtLeast(tier, g.minTier));

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r px-3 py-6 sm:flex">
      <nav className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.title ?? "root"} className="flex flex-col gap-1">
            {group.title && (
              <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
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
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="text-muted-foreground mt-auto border-t pt-4 text-xs">
        Klickbarer Prototyp &middot; Oecher Meeples
        <br />
        alle Inhalte sind Platzhalter
      </div>
    </aside>
  );
}
