"use client";

import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateLfgDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="gap-1.5"><Plus className="size-4" />Gesuch erstellen</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Spielergesuch</DialogTitle>
          <DialogDescription>
            Finde Mitspielende für ein bestimmtes Spiel oder spontan für einen Abend.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-game">Spiel (Suchfeld)</Label>
            <Input id="lfg-game" placeholder="z. B. Arche Nova" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-title">Titel</Label>
            <Input id="lfg-title" placeholder="z. B. Runde am Freitag" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfg-date">Datum</Label>
              <Input id="lfg-date" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfg-max">Max. Teilnehmer</Label>
              <Input id="lfg-max" type="number" min={2} defaultValue={4} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-desc">Beschreibung</Label>
            <Textarea id="lfg-desc" rows={3} placeholder="Worauf freust du dich, wen suchst du?" />
          </div>
        </div>
        <DialogFooter>
          <Button>Gesuch veröffentlichen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
