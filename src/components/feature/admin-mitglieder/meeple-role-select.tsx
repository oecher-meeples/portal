"use client";

import { useState } from "react";
import { useAction } from "@/components/ui/use-action";
import { setMeepleRole } from "@/components/feature/admin-mitglieder/actions";

export type RoleOption = { id: string; name: string };

/**
 * A Meeple holds exactly one role — selecting a new one swaps the
 * assignment server-side (see setMeepleRole). Meeples without a login
 * account (invite not yet redeemed) can't hold a role at all.
 */
export function MeepleRoleSelect({
  meepleId,
  roleId,
  roles,
}: {
  meepleId: string;
  roleId: string | null;
  roles: RoleOption[];
}) {
  const [value, setValue] = useState(roleId ?? "");
  const { run, pending, error } = useAction();

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const nextRoleId = event.target.value;
          setValue(nextRoleId);
          run(() => setMeepleRole(meepleId, nextRoleId));
        }}
        className="border-input h-8 rounded-md border bg-transparent px-2 text-sm disabled:opacity-60"
      >
        {!roleId && <option value="">— keine Rolle —</option>}
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
