"use client";

import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";
import { helperColorClass } from "@/lib/events/helper-colors";
import type { PlanBooking } from "@/lib/events/shift-plan-types";

export type ListRole = { roleId: string; roleName: string; shiftId: string };

/**
 * Rollen ohne Schichtplanung (Erklärer, Aufbau, Abbau …) unter dem
 * Schichtplan-Grid: je Rolle eine Zeile "Rolle [Anzahl-Badge]: zugewiesene Helfer (−)
 * | verfügbare Helfer (+)". Eine Zuweisung belegt die gesamte gemeldete
 * Verfügbarkeit, blockiert aber keine andere Rolle (Füller, andere Rollen
 * haben Vorrang).
 */
export function HelperListRoles({
  roles,
  pool,
  bookings,
  onAssign,
  onUnassign,
}: {
  roles: ListRole[];
  pool: PoolMeeple[];
  /** Nur Füller-Zuweisungen dieses Tages. */
  bookings: PlanBooking[];
  onAssign: (role: ListRole, entry: PoolMeeple) => void;
  onUnassign: (booking: PlanBooking) => void;
}) {
  if (roles.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      {roles.map((role) => {
        const assigned = bookings.filter((b) => b.roleId === role.roleId);
        const assignedIds = new Set(assigned.map((b) => b.helperId));
        const available = pool.filter(
          (entry) =>
            entry.roleId === role.roleId && !assignedIds.has(entry.helperId),
        );
        return (
          <div
            key={role.roleId}
            className="flex flex-wrap items-start gap-x-4 gap-y-1.5"
          >
            <span className="flex w-40 shrink-0 items-center gap-2 pt-0.5 text-sm font-medium">
              {role.roleName}
              <Badge aria-label={`${assigned.length} zugewiesen`}>
                {assigned.length}
              </Badge>
            </span>
            <ul
              className="flex min-w-48 flex-1 flex-wrap gap-1"
              aria-label={`${role.roleName}: zugewiesene Helfer`}
            >
              {assigned.length === 0 && (
                <li className="text-muted-foreground pt-1 text-xs">
                  Niemand zugewiesen
                </li>
              )}
              {assigned.map((booking) => (
                <li key={booking.id}>
                  <Chip
                    name={booking.displayName}
                    colorKey={booking.helperId}
                    actionLabel={`${booking.displayName} entfernen`}
                    icon={<Minus className="size-3" />}
                    onClick={() => onUnassign(booking)}
                  />
                </li>
              ))}
            </ul>
            <ul
              className="border-l-border flex min-w-48 flex-1 flex-wrap gap-1 border-l pl-4"
              aria-label={`${role.roleName}: verfügbare Helfer`}
            >
              {available.length === 0 && (
                <li className="text-muted-foreground pt-1 text-xs">
                  Niemand verfügbar
                </li>
              )}
              {available.map((entry) => (
                <li key={entry.helperId}>
                  <Chip
                    name={entry.displayName}
                    colorKey={entry.helperId}
                    actionLabel={`${entry.displayName} zuweisen`}
                    icon={<Plus className="size-3" />}
                    onClick={() => onAssign(role, entry)}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Chip({
  name,
  colorKey,
  actionLabel,
  icon,
  onClick,
}: {
  name: string;
  colorKey: string;
  actionLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded py-0.5 pr-0.5 pl-2 text-xs font-medium ${helperColorClass(colorKey)}`}
    >
      {name}
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={actionLabel}
        onClick={onClick}
      >
        {icon}
      </Button>
    </span>
  );
}
