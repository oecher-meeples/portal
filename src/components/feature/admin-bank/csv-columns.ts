/** The only columns the export ever contains (#355 — kept out of
 * `actions.ts` because a `"use server"` file may only export async
 * functions, not constants). */
export const BANK_CSV_COLUMNS = [
  "Mitgliedsnummer",
  "Name",
  "Kontoinhaber",
  "IBAN",
] as const;
