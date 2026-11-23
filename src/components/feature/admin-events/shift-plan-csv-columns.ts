/** The only columns this export ever contains (#296). Kept out of
 * `shift-plan-export-actions.ts` because a `"use server"` file may only
 * export async functions, not constants (#355). */
export const SHIFT_PLAN_CSV_COLUMNS = [
  "Rolle",
  "Von",
  "Bis",
  "Person",
  "Status",
] as const;
