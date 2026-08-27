/** Shared view types for the Schichtplan-Editor (#157 ff.) — kept separate
 * from shift-plan.ts's pure functions so both shift-plan-editor.tsx and
 * shift-plan-grid.tsx can import them without a component-to-component
 * dependency. */

export type PlanDay = {
  id: string;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type PlanShift = {
  id: string;
  dayId: string;
  roleId: string;
  roleName: string;
  capacity: number;
  /** The container's own target period (#153) — a fresh assignment
   * defaults to this window; the resize handles (#160) narrow it. */
  targetStartsAt: string;
  targetEndsAt: string;
};

/** One meeple's individual, admin-assigned time block on a Shift (#159). Ein
 * Meeple kann mehrere Blöcke auf derselben Schicht haben (Pausenablösung
 * durch dieselbe Person) — `id` identifiziert die einzelne Buchung, nicht
 * das Paar (shiftId, meepleId). */
export type PlanBooking = {
  id: string;
  shiftId: string;
  roleId: string;
  dayId: string;
  meepleId: string;
  displayName: string;
  startsAt: string;
  endsAt: string;
  /** null solange das zugewiesene Meeple die Zuweisung nicht selbst
   * bestätigt hat (#Helferplan-Zuweisungsbestätigung). */
  confirmedAt: string | null;
};
