"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import {
  updateLfgLocation,
  useOwnAddressAsLfgLocation,
} from "@/components/feature/lfg/actions";

/**
 * Editierbares Ortsfeld auf der LFG-Detailseite (#166) — nur gerendert, wenn
 * der Betrachter laut serverseitiger Prüfung (Ersteller oder beigetretener
 * Teilnehmer bei aktivem `participantsMayEditLocation`) bearbeiten darf.
 * Sonst zeigt `lfg-detail-view.tsx` den Ort weiterhin als reinen Text.
 *
 * Aufrufer müssen `key={initialLocation ?? ""}` setzen: `useOwnAddressAsLfg-
 * Location()` ändert den Ort serverseitig und ruft `router.refresh()`
 * (`useAction`-Default) — ohne Remount bliebe das clientseitige `location`-
 * `useState` auf dem alten Wert stehen, da ein geänderter Prop allein keinen
 * State-Reset auslöst.
 */
export function LfgLocationEditor({
  postId,
  initialLocation,
  hasOwnAddress,
}: {
  postId: string;
  initialLocation: string | null;
  /** Ob der Betrachter eine Adresse im Profil hinterlegt hat (#166) — nur
   * dann erscheint "Meine Adresse übernehmen". Die Adresse selbst kommt beim
   * Klick serverseitig aus `meeple.address`, nicht vom Client. */
  hasOwnAddress: boolean;
}) {
  const [location, setLocation] = useState(initialLocation ?? "");
  const save = useAction();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Ort (optional)"
          aria-label="Ort"
        />
        <Button
          type="button"
          size="sm"
          disabled={save.pending}
          onClick={() => save.run(() => updateLfgLocation(postId, location))}
        >
          {save.pending ? "Speichere…" : "Speichern"}
        </Button>
      </div>
      {hasOwnAddress && (
        <ActionButton
          variant="outline"
          size="sm"
          className="self-start"
          action={useOwnAddressAsLfgLocation.bind(null, postId)}
        >
          Meine Adresse übernehmen
        </ActionButton>
      )}
      {save.error && <p className="text-destructive text-xs">{save.error}</p>}
    </div>
  );
}
