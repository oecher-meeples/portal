"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PreviewTierSwitcher } from "@/components/feature/admin-preview-tier/preview-tier-switcher";
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
  user,
}: {
  tier: Tier;
  realTier: Tier;
  permissions: readonly string[];
  flags: Readonly<Record<NavFlag, boolean>>;
  user: { name: string } | null;
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
      className="bg-sidebar text-sidebar-foreground fixed inset-x-0 bottom-0 z-[60] flex h-16 border-t md:hidden"
    >
      {groups.map((group, index) => {
        const key = group.title ?? "root";
        const Icon = NAV_GROUP_ICONS[key];
        const active = group.items.some((item) =>
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
        );
        return (
          <DialogPrimitive.Root
            key={key}
            open={openGroup === key}
            onOpenChange={(open) => setOpenGroup(open ? key : null)}
          >
            <DialogPrimitive.Trigger
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 font-medium transition-colors",
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
                <Icon className="size-5 shrink-0" />
              </span>
              {/* Icon bleibt fest `size-5` — bei Platzmangel (schmale
                  Displays, 3 Icons teilen sich die Breite) schrumpft
                  stattdessen nur die Schrift stufenlos per `clamp()` statt
                  umzubrechen oder abgeschnitten zu werden. */}
              <span className="max-w-full truncate text-[clamp(0.5625rem,2.8vw,0.75rem)]">
                {group.title ?? "Öffentlich"}
              </span>
            </DialogPrimitive.Trigger>
            <DialogPortal>
              <DialogOverlay />
              <DialogPrimitive.Popup
                data-slot="dialog-content"
                className="bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom fixed inset-x-0 bottom-16 z-50 flex max-h-[calc(70vh-4rem)] flex-col gap-1 overflow-x-hidden rounded-t-xl p-3 text-sm ring-1 duration-150 outline-none"
              >
                {/* Preview-Tier-Switcher, Profil-Link und Theme-Umschalter
                    sind sonst nur im Header — auf `< sm` (wo die Bottom-Bar
                    ihn ersetzt) nicht erreichbar. Landen hier in der ersten
                    Gruppe statt an anderer Stelle in der Bottom-Bar selbst
                    zu leben, da es kein eigenes viertes Icon dafür geben
                    soll. Beide Zeilen rechtsbündig. */}
                {index === 0 && realTier === "admin" && (
                  <div className="flex justify-end px-2 pb-1">
                    <PreviewTierSwitcher
                      tier={tier}
                      className="flex"
                      labelClassName="inline"
                    />
                  </div>
                )}
                {index === 0 && (
                  <div className="flex items-center justify-end gap-3 px-2 pb-1">
                    {user && (
                      <Link
                        href="/profil"
                        onClick={() => setOpenGroup(null)}
                        className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 text-sm"
                      >
                        <UserRound className="text-primary size-4 shrink-0" />
                        <span className="truncate">{user.name}</span>
                      </Link>
                    )}
                    <ThemeToggle />
                  </div>
                )}
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
