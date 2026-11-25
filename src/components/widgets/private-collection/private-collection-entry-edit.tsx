"use client";

import { Plus, Trash2, X } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import {
  removePrivateCollectionEntryAction,
  setPrivateCollectionEntryFlagAction,
} from "@/components/widgets/private-collection/private-collection-actions";

export type EntryFlag = "forTrade" | "wantToPlay";

/** (+)/(x)-Schalter für „For Trade"/„Want to Play" eines Eintrags im
 * Bearbeiten-Modus des `PrivateCollectionDialog`. `refresh={false}` +
 * `onChanged` aus demselben Grund wie die Event-Freigaben dort: ein
 * `router.refresh()` bei offenem Dialog ließ dessen Schließen-Button
 * ausfallen. */
export function EntryFlagToggle({
  entryId,
  flag,
  label,
  active,
  onChanged,
}: {
  entryId: string;
  flag: EntryFlag;
  label: string;
  active: boolean;
  onChanged: (flag: EntryFlag, value: boolean) => void;
}) {
  return (
    <ActionButton
      variant={active ? "secondary" : "outline"}
      size="xs"
      refresh={false}
      title={active ? `${label} entfernen` : `${label} hinzufügen`}
      onSuccess={() => onChanged(flag, !active)}
      action={() => setPrivateCollectionEntryFlagAction(entryId, flag, !active)}
    >
      {active ? (
        <X className="text-destructive" />
      ) : (
        <Plus className="text-emerald-600" />
      )}
      {label}
    </ActionButton>
  );
}

/** Löschknopf eines Eintrags im Bearbeiten-Modus. */
export function EntryRemoveButton({
  entryId,
  title,
  onRemoved,
}: {
  entryId: string;
  title: string;
  onRemoved: () => void;
}) {
  return (
    <ActionButton
      variant="outline"
      size="icon-sm"
      refresh={false}
      aria-label={`${title} entfernen`}
      title="Aus der privaten Sammlung entfernen"
      confirm={`„${title}" aus deiner privaten Sammlung entfernen?`}
      onSuccess={onRemoved}
      action={() => removePrivateCollectionEntryAction(entryId)}
    >
      <Trash2 className="text-destructive" />
    </ActionButton>
  );
}
