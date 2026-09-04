"use client";

import { ActionButton } from "@/components/ui/action-button";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { EditSparePartListingDialog } from "@/components/feature/markt/edit-spare-part-listing-dialog";
import { deleteSparePartListing } from "@/lib/inventory/spare-part-actions";
import type { SparePartListingView } from "@/lib/inventory/spare-parts";

export function SparePartListingCard({
  part,
  canManage,
}: {
  part: SparePartListingView;
  canManage: boolean;
}) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="font-serif font-semibold">{part.title}</h3>
      <p className="text-muted-foreground text-xs">Zustand: {part.condition}</p>
      {part.description && <p className="text-sm">{part.description}</p>}
      <p className="text-muted-foreground text-xs">
        Abzuholen bei{" "}
        <ContactDialog
          name={part.keeperDisplayName}
          meeple={part.keeperContactMeeple}
        />
      </p>
      {canManage && (
        <div className="mt-2 flex gap-2">
          <EditSparePartListingDialog part={part} />
          <ActionButton
            variant="ghost"
            size="sm"
            confirm="Diesen Ersatzteillager-Eintrag wirklich löschen?"
            action={() => deleteSparePartListing(part.id)}
          >
            Löschen
          </ActionButton>
        </div>
      )}
    </div>
  );
}
