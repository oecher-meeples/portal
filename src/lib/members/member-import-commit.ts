import "server-only";
import { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "@/lib/utils/prisma";
import { uniqueSlug } from "@/lib/utils/slug";
import { UserFacingError } from "@/lib/utils/action-result";
import { memberFullName } from "@/lib/members/member-display-name";
import type { MemberImportRow } from "@/lib/members/member-import-csv";
import { buildImportPreview } from "@/lib/members/member-import-preview";
import {
  buildImportPlan,
  CREATABLE_STATUSES,
  decisionEmails,
  validateImportDecisions,
  type ImportDecisions,
  type ImportPlan,
} from "@/lib/members/member-import-decisions";

const UNIQUE_CONSTRAINT_CODE = "P2002";
/** Viele Einzel-Inserts in einer interaktiven Transaktion — der
 * Prisma-Standard (5 s) reicht für eine ganze Mitgliederliste nicht. */
const TRANSACTION_TIMEOUT_MS = 60_000;
const STALE_PREVIEW_MESSAGE =
  "Der Bestand hat sich seit der Vorschau geändert — bitte die Datei neu einlesen. Es wurde nichts angelegt.";

async function writePlan(tx: DbClient, plan: ImportPlan): Promise<number> {
  const usedSlugs = new Set<string>();
  const idByLine = new Map<number, string>();

  for (const member of plan.members) {
    const slug = await uniqueSlug(
      memberFullName(member) || `mitglied-${member.memberNumber}`,
      async (candidate) =>
        usedSlugs.has(candidate) ||
        (await tx.member.findUnique({ where: { slug: candidate } })) !== null,
    );
    usedSlugs.add(slug);
    const created = await tx.member.create({
      data: {
        memberNumber: member.memberNumber,
        slug,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        meepleId: member.meepleId,
        // #611: kein Geburts-/Beitrittsdatum, keine Adresse im Export.
        birthDate: null,
        joinedAt: null,
      },
      select: { id: true },
    });
    idByLine.set(member.line, created.id);
  }

  for (const link of plan.guardianLinks) {
    const childMemberId = idByLine.get(link.childLine);
    const guardianMemberId = link.guardian.startsWith("row:")
      ? idByLine.get(Number(link.guardian.slice("row:".length)))
      : link.guardian.slice("member:".length);
    if (!childMemberId || !guardianMemberId) {
      throw new UserFacingError(STALE_PREVIEW_MESSAGE);
    }
    await tx.memberGuardian.create({
      data: { childMemberId, guardianMemberId },
    });
  }

  return plan.members.length;
}

/**
 * Legt den Mitgliederimport atomar an (#611): baut den Abgleich mit dem
 * Bestand neu auf, prüft alle Entscheidungen erneut und schreibt Member +
 * `MemberGuardian` in **einer** Transaktion — bei offenen Punkten oder
 * geändertem Bestand wird nichts geschrieben. Verschickt keine Einladungen.
 *
 * Fehlermeldungen und Logs nennen nur Zeilennummern, nie Namen/Adressen.
 */
export async function commitMemberImport(
  rows: MemberImportRow[],
  decisions: ImportDecisions,
): Promise<{ created: number }> {
  const preview = await buildImportPreview(rows, decisionEmails(decisions));

  const staleLines = preview.rows
    .filter(
      (row) =>
        decisions[row.line] !== undefined &&
        !CREATABLE_STATUSES.has(row.status),
    )
    .map((row) => row.line);
  if (staleLines.length > 0) {
    throw new UserFacingError(
      `${STALE_PREVIEW_MESSAGE} (Zeile ${staleLines.join(", ")})`,
    );
  }

  const issues = validateImportDecisions(preview, decisions);
  if (issues.length > 0) {
    throw new UserFacingError(
      `Noch offene Punkte, es wurde nichts angelegt: ${issues
        .slice(0, 5)
        .map((issue) => `Zeile ${issue.line}: ${issue.message}`)
        .join(" ")}`,
    );
  }

  const plan = buildImportPlan(preview, decisions);
  try {
    const created = await prisma.$transaction((tx) => writePlan(tx, plan), {
      timeout: TRANSACTION_TIMEOUT_MS,
    });
    return { created };
  } catch (error) {
    if (error instanceof UserFacingError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_CODE
    ) {
      throw new UserFacingError(STALE_PREVIEW_MESSAGE);
    }
    // Bewusst ohne die Fehlermeldung selbst — Prisma-Meldungen können die
    // Eingabedaten (Namen, Adressen) enthalten.
    console.error("Mitgliederimport fehlgeschlagen", {
      name: error instanceof Error ? error.name : typeof error,
      code:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : undefined,
    });
    throw new UserFacingError(
      "Der Import ist fehlgeschlagen. Es wurde nichts angelegt.",
    );
  }
}
