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
  decisionEmails,
  validateImportDecisions,
  type ImportPlan,
} from "@/lib/members/member-import-decisions";
import {
  CREATABLE_STATUSES,
  type ImportDecisions,
} from "@/lib/members/member-import-types";

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
export function commitMemberImport(
  rows: MemberImportRow[],
  decisions: ImportDecisions,
): Promise<{ created: number }> {
  return withImportErrorHandling(() => writeImport(rows, decisions));
}

async function writeImport(
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
  const created = await prisma.$transaction((tx) => writePlan(tx, plan), {
    timeout: TRANSACTION_TIMEOUT_MS,
  });
  return { created };
}

/** Programmierfehler der Laufzeit — deren Meldung beschreibt den Code, nie
 * die Eingabe („Cannot read properties of undefined …"). */
const RUNTIME_ERRORS = [TypeError, RangeError, ReferenceError, SyntaxError];

/** Welche Abfrage und welches Argument Prisma beanstandet — nur die
 * Kopfzeile („Invalid `tx.member.create()` invocation") und die
 * Argument-Zeilen, nie die mit ausgegebenen Eingabewerte. */
function validationLocation(message: string): string[] {
  const lines = message.split("\n").map((line) => line.trim());
  const invocation = lines.find((line) =>
    /^Invalid `.*` invocation/.test(line),
  );
  const problems = lines.filter((line) =>
    /^(Unknown )?[Aa]rgument `[\w.]+`/.test(line),
  );
  return [invocation, ...problems.slice(0, 3)].filter((part): part is string =>
    Boolean(part),
  );
}

/** Technischer Hinweis für Admin und Log, ohne Zeileninhalte: Fehlertyp,
 * Prisma-Code und bei Laufzeitfehlern Meldung samt erstem Stack-Frame.
 * Meldungen von Prisma und Datenbank bleiben draußen, sie können Namen und
 * Adressen enthalten. */
function failureHint(error: unknown, code: string | undefined): string {
  if (!(error instanceof Error)) return typeof error;
  const parts = [error.name];
  if (code) parts.push(code);
  if (error instanceof Prisma.PrismaClientValidationError) {
    parts.push(...validationLocation(error.message));
  } else if (RUNTIME_ERRORS.some((type) => error instanceof type)) {
    parts.push(error.message);
    const frame = error.stack?.split("\n").find((line) => /^\s+at /.test(line));
    if (frame) parts.push(frame.trim());
  }
  return parts.join(": ");
}

/**
 * Fehlerbehandlung für beide Import-Actions (#611): fachliche Meldungen
 * gehen durch, ein Unique-Konflikt wird zu „Bestand geändert", alles andere
 * zu einer generischen Meldung samt technischem Hinweis (`failureHint`).
 * Geloggt werden nur Fehlertyp und -code — Prisma-Meldungen können die
 * Eingabedaten (Namen, Adressen) enthalten.
 */
export async function withImportErrorHandling<T>(
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof UserFacingError) throw error;
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : undefined;
    if (code === UNIQUE_CONSTRAINT_CODE) {
      throw new UserFacingError(STALE_PREVIEW_MESSAGE);
    }
    const hint = failureHint(error, code);
    // Als String, nicht als Objekt: der Dev-Logger gibt Objekte als `{}` aus.
    console.error(`Mitgliederimport fehlgeschlagen (${hint})`);
    throw new UserFacingError(
      `Der Import ist fehlgeschlagen. Es wurde nichts angelegt. (${hint})`,
    );
  }
}
