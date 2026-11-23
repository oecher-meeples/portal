"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SettingsCardButton } from "@/components/feature/admin-settings/settings-card-button";
import { InviteSettingsForm } from "@/components/feature/admin-settings/invite-settings-form";

/** "Einladungen"-Karte auf /admin/einstellungen öffnet seit #350 einen
 * Popup-Dialog statt zu einer eigenen Seite zu navigieren — die bisherige
 * Route (/admin/einstellungen/einladungen) redirected jetzt hierher. */
export function InviteSettingsDialog({ defaultDays }: { defaultDays: number }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <SettingsCardButton
            title="Einladungen"
            description="Gültigkeitsdauer für neue Einladungen festlegen."
          />
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einladungen</DialogTitle>
        </DialogHeader>
        <InviteSettingsForm defaultDays={defaultDays} />
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
