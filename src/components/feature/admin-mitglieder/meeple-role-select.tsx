"use client";

import { useState } from "react";
import { useAction } from "@/components/ui/use-action";
import {
  assignMeepleRole,
  removeMeepleRole,
} from "@/components/feature/admin-mitglieder/actions";
import type { MeepleRoleAssignment } from "@/lib/auth/user-roles";
import { formatDatePlain } from "@/lib/utils/format";

export type RoleOption = { id: string; name: string };

function isActive(assignment: MeepleRoleAssignment, now: Date) {
  const startsAt = new Date(assignment.startsAt);
  const endsAt = assignment.endsAt ? new Date(assignment.endsAt) : null;
  return startsAt <= now && (!endsAt || endsAt > now);
}

/**
 * A Meeple can hold several roles at once (#335) — each assignment can be
 * removed independently (ends it now, history stays visible, see #264).
 * Adding a role is a plain "starts now, never ends" assignment; a term of
 * office with an explicit window isn't editable here (admin:access-Vorgabe,
 * bewusst kein UI-Feinschliff in Paket 1 — siehe Ausführungsplan Paket 6).
 */
export function MeepleRoleSelect({
  meepleId,
  assignments,
  roles,
  protected: isProtected = false,
}: {
  meepleId: string;
  assignments: MeepleRoleAssignment[];
  roles: RoleOption[];
  /** Der seed-erzeugte Fallback-Admin (displayName "Admin") — Rollen bleiben fest. */
  protected?: boolean;
}) {
  const [pendingRoleId, setPendingRoleId] = useState("");
  const { run, pending, error } = useAction();
  const now = new Date();

  const active = assignments.filter((a) => isActive(a, now));
  const expired = assignments.filter((a) => !isActive(a, now));
  const activeRoleIds = new Set(active.map((a) => a.roleId));
  const assignableRoles = roles.filter((role) => !activeRoleIds.has(role.id));

  if (isProtected) {
    return (
      <span
        className="text-muted-foreground text-sm"
        title="Die Rollen dieses Kontos sind geschützt und können nicht geändert werden."
      >
        {active.map((a) => a.roleName).join(", ") || "—"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {active.length === 0 && (
          <span className="text-muted-foreground text-sm">— keine Rolle —</span>
        )}
        {active.map((assignment) => (
          <span
            key={assignment.id}
            className="border-input inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
          >
            {assignment.roleName}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeMeepleRole(assignment.id))}
              className="text-muted-foreground hover:text-destructive disabled:opacity-60"
              aria-label={`Rolle ${assignment.roleName} entfernen`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {assignableRoles.length > 0 && (
        <select
          value={pendingRoleId}
          disabled={pending}
          onChange={(event) => {
            const roleId = event.target.value;
            if (!roleId) return;
            setPendingRoleId("");
            run(() => assignMeepleRole(meepleId, roleId));
          }}
          className="border-input h-8 rounded-md border bg-transparent px-2 text-sm disabled:opacity-60"
        >
          <option value="">+ Rolle hinzufügen …</option>
          {assignableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      )}
      {expired.length > 0 && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">
            {expired.length} abgelaufene Zuweisung(en)
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {expired.map((assignment) => (
              <li key={assignment.id}>
                {assignment.roleName}: {formatDatePlain(assignment.startsAt)}
                {" – "}
                {assignment.endsAt
                  ? formatDatePlain(assignment.endsAt)
                  : "offen"}
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
