"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { CoverMedia } from "@/components/ui/cover-media";
import { CreateLinkDialog } from "@/components/feature/dashboard/create-link-dialog";
import { EditLinkDialog } from "@/components/feature/dashboard/edit-link-dialog";
import { deleteImportantLink } from "@/lib/links/actions";
import type { ImportantLinkRow } from "@/lib/links/links";

/** Editierbare Variante von `ImportantLinksGrid` für Admins mit `links:manage`
 * (Pivot #110) — ersetzt die separate `/admin/wichtige-links`-Seite, jede Card
 * bekommt Bearbeiten/Löschen, am Ende steht eine gestrichelte "Hinzufügen"-Card. */
export function ImportantLinksEditor({ links }: { links: ImportantLinkRow[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {links.map((link) => (
        <div
          key={link.id}
          className="bg-card flex flex-col items-center gap-2 rounded-lg border p-6 text-center"
        >
          <CoverMedia
            imageUrl={link.iconUrl}
            alt=""
            aspect="aspect-square"
            className="w-8"
          />
          <span className="font-serif font-semibold">{link.title}</span>
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
        </div>
      ))}
      <CreateLinkDialog
        trigger={
          <button
            type="button"
            className="text-muted-foreground hover:border-primary/60 hover:text-primary flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm transition-colors"
          >
            <Plus className="size-6" />
            Hinzufügen
          </button>
        }
      />
    </div>
  );
}
