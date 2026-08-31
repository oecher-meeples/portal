"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteSettingsForm } from "@/components/feature/admin-settings/invite-settings-form";

/** "Einladungen"-Karte auf /admin/einstellungen öffnet seit #350 einen
 * Popup-Dialog statt zu einer eigenen Seite zu navigieren — die bisherige
 * Route (/admin/einstellungen/einladungen) redirected jetzt hierher. */
export function InviteSettingsDialog({
  defaultDays,
}: {
  defaultDays: number;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="w-full text-left">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle>Einladungen</CardTitle>
                <CardDescription>
                  Gültigkeitsdauer für neue Einladungen festlegen.
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
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
