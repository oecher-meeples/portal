"use client";

import { useState } from "react";
import { useAction } from "@/components/ui/use-action";
import {
  assignMeepleRole,
  removeMeepleRole,
} from "@/components/feature/admin-mitglieder/actions";
import type { MeepleRoleAssignment } from "@/lib/auth/user-roles";
import { formatDatePlain } from "@/lib/utils/format";

export type RoleOption = { id: string; name: string; isSystemRole: boolean };

/** Shared with the read-only badge display in `mitglieder-table.tsx`
 * (#346) — a table row shows the same "active now" set, just without the
 * assign/remove controls. */
export function isActive(assignment: MeepleRoleAssignment, now: Date) {
  const startsAt = new Date(assignment.startsAt);
  const endsAt = assignment.endsAt ? new Date(assignment.endsAt) : null;
  return startsAt <= now && (!endsAt || endsAt > now);
}

/**
 * A Meeple can hold several roles at once (#335) — each assignment can be
 * removed independently (ends it now, history stays visible, see #264).
 * Adding a role is a plain "starts now, never ends" assignment by default;
 * with `admin:access` an explicit Amtszeit-Zeitfenster (Start-/Enddatum,
 * #264/#352) can be set before picking the role.
 */
export function MeepleRoleSelect({
  meepleId,
  assignments,
  roles,
  canManageAdminAccess,
  protected: isProtected = false,
}: {
  meepleId: string;
  assignments: MeepleRoleAssignment[];
  roles: RoleOption[];
  /** Viewer hält `admin:access` (#353) — sonst bleiben Systemrollen
   * ("Ausgetreten"/"sysadmin") read-only sichtbar, aber nicht zuweisbar
   * oder entfernbar; auch das Amtszeit-Datumsfeld (#352) bleibt dann
   * ausgeblendet. */
  canManageAdminAccess: boolean;
  /** Der seed-erzeugte Fallback-Admin (displayName "Admin") — Rollen bleiben fest. */
  protected?: boolean;
}) {
  const [pendingRoleId, setPendingRoleId] = useState("");
  const [windowStartsAt, setWindowStartsAt] = useState("");
  const [windowEndsAt, setWindowEndsAt] = useState("");
  const { run, pending, error } = useAction();
  const now = new Date();

  const active = assignments.filter((a) => isActive(a, now));
  const expired = assignments.filter((a) => !isActive(a, now));
  const activeRoleIds = new Set(active.map((a) => a.roleId));
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const assignableRoles = roles.filter(
    (role) =>
      !activeRoleIds.has(role.id) &&
      (canManageAdminAccess || !role.isSystemRole),
  );

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
        {active.map((assignment) => {
          const canRemove =
            canManageAdminAccess ||
            !roleById.get(assignment.roleId)?.isSystemRole;
          return (
            <span
              key={assignment.id}
              className="border-input inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            >
              {assignment.roleName}
              {canRemove && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeMeepleRole(assignment.id))}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-60"
                  aria-label={`Rolle ${assignment.roleName} entfernen`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
      {assignableRoles.length > 0 && (
        <>
          {canManageAdminAccess && (
            <div className="flex items-center gap-1 text-xs">
              <label className="text-muted-foreground">
                Amtszeit (optional):
              </label>
              <input
                type="date"
                value={windowStartsAt}
                disabled={pending}
                onChange={(event) => setWindowStartsAt(event.target.value)}
                className="border-input h-7 rounded-md border bg-transparent px-1.5 disabled:opacity-60"
                aria-label="Amtszeit-Start"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="date"
                value={windowEndsAt}
                disabled={pending}
                onChange={(event) => setWindowEndsAt(event.target.value)}
                className="border-input h-7 rounded-md border bg-transparent px-1.5 disabled:opacity-60"
                aria-label="Amtszeit-Ende"
              />
            </div>
          )}
          <select
            value={pendingRoleId}
            disabled={pending}
            onChange={(event) => {
              const roleId = event.target.value;
              if (!roleId) return;
              setPendingRoleId("");
              const window =
                canManageAdminAccess && (windowStartsAt || windowEndsAt)
                  ? {
                      startsAt: windowStartsAt
                        ? new Date(windowStartsAt)
                        : new Date(),
                      endsAt: windowEndsAt ? new Date(windowEndsAt) : null,
                    }
                  : undefined;
              run(() => assignMeepleRole(meepleId, roleId, window)).then(
                (succeeded) => {
                  if (succeeded) {
                    setWindowStartsAt("");
                    setWindowEndsAt("");
                  }
                },
              );
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
        </>
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
