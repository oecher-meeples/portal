"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { toResult, UserFacingError } from "@/lib/utils/action-result";
import type { MemberImportRow } from "@/lib/members/member-import-csv";
import type { ImportDecisions } from "@/lib/members/member-import-types";
import { buildImportPreview } from "@/lib/members/member-import-preview";
import {
  commitMemberImport as commitMemberImportRecord,
  withImportErrorHandling,
} from "@/lib/members/member-import-commit";

/** Obergrenze pro Import — die Vereinsliste hat einige hundert Zeilen, alles
 * darüber ist kein plausibler Export mehr. */
const MAX_IMPORT_ROWS = 2000;
const MAX_TEXT_LENGTH = 200;

const nullableText = z.string().max(MAX_TEXT_LENGTH).nullable();

const rowsSchema = z
  .array(
    z.object({
      line: z.number().int().positive(),
      memberNumber: z.number().int().positive(),
      firstName: nullableText,
      lastName: nullableText,
      email: nullableText,
    }),
  )
  .max(MAX_IMPORT_ROWS);

const decisionsSchema = z.record(
  z.string().regex(/^\d+$/),
  z.object({
    role: z.enum(["adult", "child"]).nullable(),
    email: z.string().max(MAX_TEXT_LENGTH),
    noEmail: z.boolean(),
    keepsSharedEmail: z.boolean(),
    linkMeeple: z.boolean(),
    skip: z.boolean(),
    family: z
      .string()
      .regex(/^(row:\d+|member:[\w-]+)$/)
      .nullable(),
  }),
);

/** Dem Client nichts blind glauben — Form und Größe prüfen, ohne Inhalte
 * in die Meldung zu übernehmen (#611). */
function parseRows(rows: unknown): MemberImportRow[] {
  const parsed = rowsSchema.safeParse(rows);
  if (!parsed.success) {
    throw new UserFacingError(
      `Ungültige Importdaten (höchstens ${MAX_IMPORT_ROWS} Zeilen).`,
    );
  }
  return parsed.data;
}

function parseDecisions(decisions: unknown): ImportDecisions {
  const parsed = decisionsSchema.safeParse(decisions);
  if (!parsed.success) throw new UserFacingError("Ungültige Zuordnungen.");
  return Object.fromEntries(
    Object.entries(parsed.data).map(([line, decision]) => [
      Number(line),
      decision,
    ]),
  );
}

/** Abgleich der im Browser geparsten Zeilen mit dem Bestand (#611) — die
 * Rohdatei kommt nie hier an. */
export async function previewMemberImport(rows: MemberImportRow[]) {
  await requireActionPermission("members:manage");

  return toResult(() =>
    withImportErrorHandling(() => buildImportPreview(parseRows(rows))),
  );
}

/** Legt den Import atomar an (#611), ohne Einladungen zu verschicken. */
export async function commitMemberImport(
  rows: MemberImportRow[],
  decisions: ImportDecisions,
) {
  await requireActionPermission("members:manage");

  return toResult(
    () => commitMemberImportRecord(parseRows(rows), parseDecisions(decisions)),
    () => revalidatePath("/admin/mitglieder"),
  );
}
