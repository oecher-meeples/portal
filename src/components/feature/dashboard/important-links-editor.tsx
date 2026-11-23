"use client";

import { Card } from "@/components/ui/card";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { CoverMedia } from "@/components/ui/cover-media";
import {
  LINK_GRID_CLASS,
  LINK_TILE_CLASS,
  LINK_TILE_LABEL_CLASS,
} from "@/components/widgets/important-links-grid";
import { cn } from "@/lib/utils/cn";
import { CreateLinkDialog } from "@/components/feature/dashboard/create-link-dialog";
import { EditLinkDialog } from "@/components/feature/dashboard/edit-link-dialog";
import { deleteImportantLink } from "@/lib/links/actions";
import type { ImportantLinkRow } from "@/lib/links/links";

/** Editierbare Variante von `ImportantLinksGrid` für Admins mit `links:manage`
 * (Pivot #110) — ersetzt die separate `/admin/wichtige-links`-Seite, jede Card
 * bekommt Bearbeiten/Löschen, am Ende steht eine gestrichelte "Hinzufügen"-Card. */
export function ImportantLinksEditor({ links }: { links: ImportantLinkRow[] }) {
  return (
    <div className={LINK_GRID_CLASS}>
      {links.map((link) => (
        <Card key={link.id} layout="tile" className={LINK_TILE_CLASS}>
          <CoverMedia
            sizes="32px"
            imageUrl={link.iconUrl}
            alt=""
            aspect="aspect-square"
            className="w-8"
          />
          <span className={LINK_TILE_LABEL_CLASS}>{link.title}</span>
          <div className="mt-1 flex gap-1">
            <EditLinkDialog
              link={link}
              trigger={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`"${link.title}" bearbeiten`}
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <ActionButton
              variant="destructive"
              size="icon-sm"
              confirm="Link wirklich löschen?"
              action={deleteImportantLink.bind(null, link.id)}
              aria-label={`"${link.title}" löschen`}
            >
              <Trash2 className="size-3.5" />
            </ActionButton>
          </div>
        </Card>
      ))}
      <CreateLinkDialog
        trigger={
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:border-primary/60 hover:text-primary bg-card/60 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-center text-sm transition-colors",
              LINK_TILE_CLASS,
            )}
          >
            <Plus className="size-6" />
            Hinzufügen
          </button>
        }
      />
    </div>
  );
}
