"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getVisibleNavGroups,
  NAV_GROUP_ICONS,
  type NavFlag,
  type Tier,
} from "@/lib/utils/nav-config";
import { cn } from "@/lib/utils/cn";

/**
 * Mobile Bottom-Bar (#437) für `< sm` — dort ist die Sidebar komplett
 * ausgeblendet. Ein Icon je `NAV_GROUPS`-Gruppe (leere Gruppen fallen über
 * `getVisibleNavGroups` bereits weg); Tippen öffnet ein von unten
 * eingeblendetes Bottom-Sheet mit genau den Einträgen, die die Desktop-
 * Sidebar für diesen Nutzer in derselben Gruppe zeigen würde — dieselbe
 * Sichtbarkeitslogik, kein Parallelregelwerk. Eigene, schlanke Popup-
 * Variante statt der zentrierten `DialogContent` (kein fertiger Sheet-
 * Baustein vorhanden, s. Issue) — analog zu `ui/dialog.tsx` aufgebaut.
 */
export function MobileNav({
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
  const previewingLowerTier = realTier === "admin" && tier !== "admin";
  const groups = getVisibleNavGroups(
    tier,
    new Set(permissions),
    previewingLowerTier,
    flags,
  );
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav
      aria-label="Hauptnavigation"
      className="bg-sidebar text-sidebar-foreground fixed inset-x-0 bottom-0 z-20 flex border-t sm:hidden"
    >
      {groups.map((group) => {
        const key = group.title ?? "root";
        const Icon = NAV_GROUP_ICONS[key];
        const active = group.items.some((item) =>
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href),
        );
        return (
          <DialogPrimitive.Root
            key={key}
            open={openGroup === key}
            onOpenChange={(open) => setOpenGroup(open ? key : null)}
          >
            <DialogPrimitive.Trigger
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/70",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-md px-3 py-1",
                  active && "bg-sidebar-primary/15",
                )}
              >
                <Icon className="size-5" />
              </span>
              {group.title ?? "Öffentlich"}
            </DialogPrimitive.Trigger>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col gap-1 rounded-t-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm ring-1 duration-150 outline-none"
              >
                <DialogTitle className="px-2 py-1.5 text-xs font-bold tracking-wider uppercase">
                  {group.title ?? "Öffentlich"}
                </DialogTitle>
                <div className="overflow-y-auto">
                  {group.items.map((item) => {
                    const itemActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenGroup(null)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors",
                          itemActive
                            ? "bg-sidebar-primary/15 text-foreground"
                            : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <ItemIcon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </DialogPrimitive.Popup>
            </DialogPortal>
          </DialogPrimitive.Root>
        );
      })}
    </nav>
  );
}
