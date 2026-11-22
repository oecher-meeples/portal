"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { ActionDialogOpenOverride } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

/**
 * Eine Aktion im Titelblock der Spieledetailseite. `node` ist der fertige
 * Einzelbutton (ggf. samt Dialog, von der Seite komponiert); `label`/`icon`
 * bilden den Eintrag im „⋯"-Menü. Mit `href` ist der Menüeintrag ein Link,
 * sonst öffnet er den `ActionDialog` in `node`.
 */
export type GameTitleAction = {
  key: string;
  label: string;
  icon: ReactNode;
  node: ReactNode;
  href?: string;
  /** Externer Link — neuer Tab. */
  external?: boolean;
};

/**
 * Aktionen neben dem Spieltitel (#586): Ist der Titelblock (Container
 * `title-block`) breiter als 35 rem (~560 px), stehen sie als Einzelbuttons
 * da, sonst hinter einem „⋯"-Menü. Bei vier Aktionen (mit „Titel
 * bearbeiten") erst ab 45 rem, sonst bliebe für den Titel kaum Platz. Container- statt Viewport-Query, weil
 * Sidebar und zweispaltiges Layout ab `lg` die Titelzeile unabhängig vom
 * Viewport schmal machen.
 *
 * Die Einzelbuttons bleiben auch im schmalen Fall montiert (nur
 * ausgeblendet) — so leben ihre Dialoge außerhalb des Menüs, öffnen sich
 * per kontrolliertem State aus dem Menüeintrag und werden beim Schließen des
 * Menüs nicht mit ausgehängt.
 */
export function GameTitleActions({ actions }: { actions: GameTitleAction[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (actions.length === 0) return null;
  // Statische Klassen (Tailwind scannt nur vollständige Strings).
  const crowded = actions.length >= 4;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        className={cn(
          "hidden items-center gap-2",
          crowded ? "@[45rem]/title-block:flex" : "@[35rem]/title-block:flex",
        )}
      >
        {actions.map((action) => (
          <ActionDialogOpenOverride
            key={action.key}
            open={openKey === action.key}
            onOpenChange={(open) => setOpenKey(open ? action.key : null)}
          >
            {action.node}
          </ActionDialogOpenOverride>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Weitere Aktionen"
              className={
                crowded
                  ? "@[45rem]/title-block:hidden"
                  : "@[35rem]/title-block:hidden"
              }
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-auto">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              onClick={action.href ? undefined : () => setOpenKey(action.key)}
              render={
                action.href ? (
                  action.external ? (
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ) : (
                    <Link href={action.href} />
                  )
                ) : undefined
              }
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
