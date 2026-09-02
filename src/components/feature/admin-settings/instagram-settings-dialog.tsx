"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SettingsCardButton } from "@/components/feature/admin-settings/settings-card-button";
import { InstagramConnectionView } from "@/components/feature/admin-settings/instagram-connection-view";

/** "Instagram"-Karte auf /admin/einstellungen öffnet seit #351 einen
 * Popup-Dialog statt zu einer eigenen Seite zu navigieren — analog
 * `InviteSettingsDialog`/`TshirtSizeDialog`. Die bisherige Route
 * (/admin/einstellungen/instagram) redirected jetzt hierher. */
export function InstagramSettingsDialog({
  connected,
  expiresAt,
}: {
  connected: boolean;
  expiresAt: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <SettingsCardButton
            title="Instagram"
            description="Cross-Posting von Beiträgen nach Instagram verwalten."
            status={
              connected
                ? { label: "Verbunden", variant: "default" }
                : { label: "Nicht verbunden", variant: "outline" }
            }
          />
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instagram</DialogTitle>
        </DialogHeader>
        <InstagramConnectionView connected={connected} expiresAt={expiresAt} />
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
