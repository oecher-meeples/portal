import type { RoleColumnGroup } from "@/lib/events/shift-plan";
import { helperColorClass } from "@/lib/events/helper-colors";

export type PoolMeeple = {
  meepleId: string;
  displayName: string;
  /** One row per (meeple, role) — a meeple available for several roles
   * appears once per role, per AC (#158). */
  roleId: string;
};

/**
 * Leiste oberhalb des Kalenders (#158): für jeden Tag alle verfügbaren
 * Meeples, in Spalten je Rolle gruppiert — dieselbe Breiten-Proportion wie
 * die Kalender-Spalten (`buildRoleColumns`), damit Pool und Kalender optisch
 * ausgerichtet sind. Farbige Rechtecke je Helfer (`helperColorClass`,
 * konsistent über Pool und spätere Zuweisung hinweg). Drag&Drop und die
 * gelbe "bereits verplant"-Markierung folgen in #159/#161.
 */
export function HelperPoolBar({
  columns,
  pool,
}: {
  columns: RoleColumnGroup[];
  pool: PoolMeeple[];
}) {
  if (columns.length === 0) return null;

  const columnCount = columns.reduce((sum, group) => sum + group.capacity, 0);

  return (
    <div
      className="grid gap-x-0"
      style={{
        gridTemplateColumns: `5rem repeat(${columnCount}, minmax(4rem, 1fr))`,
      }}
    >
      <div />
      {columns.map((group) => {
        const forRole = pool.filter((entry) => entry.roleId === group.roleId);
        return (
          <div
            key={group.roleId}
            className="flex flex-wrap gap-1 border-l p-1.5"
            style={{ gridColumn: `span ${group.capacity}` }}
          >
            {forRole.length === 0 ? (
              <span className="text-muted-foreground text-xs">
                Niemand verfügbar
              </span>
            ) : (
              forRole.map((entry) => (
                <span
                  key={`${entry.meepleId}-${entry.roleId}`}
                  className={`rounded px-2 py-1 text-xs font-medium ${helperColorClass(entry.meepleId)}`}
                >
                  {entry.displayName}
                </span>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
