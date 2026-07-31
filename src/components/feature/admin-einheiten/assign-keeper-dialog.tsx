"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { assignStorageUnitKeeper } from "@/components/feature/admin-einheiten/actions";

export type KeeperOption = { id: string; displayName: string };

/**
 * Admins can hand a unit's keeper role to anyone; everyone else can only
 * claim it for themselves.
 */
export function AssignKeeperDialog({
  unitId,
  currentKeeperId,
  currentKeeperName,
  isAdmin,
  keeperOptions,
  selfMeepleId,
}: {
  unitId: string;
  currentKeeperId: string | null;
  currentKeeperName: string | null;
  isAdmin: boolean;
  keeperOptions: KeeperOption[];
  selfMeepleId: string;
}) {
  const [selected, setSelected] = useState(currentKeeperId ?? "");

  if (!isAdmin) {
    const isSelf = currentKeeperId === selfMeepleId;
    return (
      <ActionDialog
        trigger={
          <Button size="sm" variant="outline" disabled={isSelf}>
            {isSelf ? "Du bist Verwahrer" : "Mir zuweisen"}
          </Button>
        }
        title="Einheit übernehmen"
        description={
          currentKeeperName
            ? `Aktueller Verwahrer: ${currentKeeperName}. Du übernimmst die Einheit.`
            : "Du wirst Verwahrer dieser Einheit."
        }
        submitLabel="Übernehmen"
        action={() => assignStorageUnitKeeper(unitId, selfMeepleId)}
      />
    );
  }

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          Verwahrer zuweisen
        </Button>
      }
      title="Verwahrer zuweisen"
      description={
        currentKeeperName
          ? `Aktuell: ${currentKeeperName}`
          : "Aktuell kein Verwahrer."
      }
      submitLabel="Zuweisen"
      action={() => assignStorageUnitKeeper(unitId, selected || null)}
      onReset={() => setSelected(currentKeeperId ?? "")}
    >
      <select
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
      >
        <option value="">— kein Verwahrer —</option>
        {keeperOptions.map((meeple) => (
          <option key={meeple.id} value={meeple.id}>
            {meeple.displayName}
          </option>
        ))}
      </select>
    </ActionDialog>
  );
}
