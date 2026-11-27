"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { toResult, UserFacingError } from "@/lib/utils/action-result";
import type { GuestImportRow } from "@/lib/events/guest-import-csv";
import { commitGuestImport as commitGuestImportRecord } from "@/lib/events/guest-import";

const MAX_IMPORT_ROWS = 500;

const rowsSchema = z
  .array(
    z.object({
      line: z.number().int().positive(),
      name: z.string().min(1).max(200),
      dayId: z.string().min(1),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      roleIds: z.array(z.string().min(1)).min(1).max(50),
    }),
  )
  .max(MAX_IMPORT_ROWS);

/** Legt Gäste samt Verfügbarkeit aus den im Browser geparsten Zeilen an (#698). */
export async function commitGuestImport(
  eventId: string,
  rows: GuestImportRow[],
) {
  await requireActionPermission("events:manage");

  return toResult(
    () => {
      const parsed = rowsSchema.safeParse(rows);
      if (!parsed.success) {
        throw new UserFacingError(
          `Ungültige Importdaten (höchstens ${MAX_IMPORT_ROWS} Zeilen).`,
        );
      }
      return commitGuestImportRecord(eventId, parsed.data);
    },
    () => revalidatePath(`/admin/events/${eventId}`),
  );
}
