import "server-only";
import { prisma, type DbClient } from "@/lib/utils/prisma";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple-name";
import {
  groupByEmail,
  type MemberImportRow,
} from "@/lib/members/member-import-csv";
import {
  memberRef,
  type ImportEmailOwner,
  type ImportGroup,
  type ImportPreviewRow,
  type MemberImportPreview,
} from "@/lib/members/member-import-decisions";

/**
 * Wem gehören diese (lowercased) E-Mail-Adressen schon — Batch-Gegenstück zu
 * `findMemberEmailConflict()` (`member-email.ts`) für den Mitgliederimport
 * (#611): eine Abfrage pro Tabelle statt einer pro Zeile.
 */
export async function findEmailOwners(
  emails: string[],
  db: DbClient = prisma,
): Promise<Record<string, ImportEmailOwner>> {
  const unique = [...new Set(emails)];
  if (unique.length === 0) return {};

  const [members, authUsers] = await Promise.all([
    db.member.findMany({
      where: { email: { in: unique } },
      select: {
        id: true,
        email: true,
        _count: { select: { guardians: true } },
      },
    }),
    db.authUser.findMany({
      where: { email: { in: unique, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
    }),
  ]);
  const meeples = authUsers.length
    ? await db.meeple.findMany({
        where: { neonAuthUserId: { in: authUsers.map((user) => user.id) } },
        select: {
          id: true,
          displayName: true,
          neonAuthUserId: true,
          member: { select: { id: true } },
        },
      })
    : [];

  const owners: Record<string, ImportEmailOwner> = {};
  const ownerOf = (email: string) =>
    (owners[email] ??= { member: null, login: null });
  for (const member of members) {
    if (!member.email) continue;
    ownerOf(member.email).member = {
      id: member.id,
      isChild: member._count.guardians > 0,
    };
  }
  for (const user of authUsers) {
    const meeple = meeples.find((m) => m.neonAuthUserId === user.id);
    ownerOf(user.email.toLowerCase()).login = {
      meepleId: meeple?.id ?? null,
      displayName: meeple?.displayName ?? user.name,
      hasMember: meeple?.member != null,
    };
  }
  return owners;
}

/** Bestehende Mitglieder, die Erziehungsberechtigte sein können: keine
 * Kinder, ohne Sammel- und System-Konten. */
async function listExistingGuardianOptions(db: DbClient) {
  const members = await db.member.findMany({
    where: { guardians: { none: {} } },
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      meeple: {
        select: {
          displayName: true,
          isSystemAccount: true,
          anonymizedAt: true,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return members
    .filter(
      (member) =>
        member.meeple?.displayName !== ANONYMER_MEEPLE_NAME &&
        !member.meeple?.isSystemAccount &&
        !member.meeple?.anonymizedAt,
    )
    .map((member) => ({
      id: memberRef(member.id),
      label: `${memberDisplayName(member)} (Nr. ${member.memberNumber})`,
    }));
}

function statusFor(
  row: MemberImportRow,
  owners: Record<string, ImportEmailOwner>,
  groupEmails: Set<string>,
): Pick<ImportPreviewRow, "status" | "message"> {
  if (!row.email) return { status: "needsRole", message: null };
  const owner = owners[row.email];
  if (owner?.member?.isChild) {
    return {
      status: "error",
      message:
        "E-Mail-Adresse gehört einem bestehenden Kind-Mitglied (hat Erziehungsberechtigte).",
    };
  }
  if (!owner?.member && owner?.login?.hasMember) {
    return {
      status: "error",
      message: "E-Mail-Adresse gehört dem Login eines anderen Mitglieds.",
    };
  }
  if (owner?.member || groupEmails.has(row.email)) {
    return { status: "group", message: null };
  }
  if (owner?.login) return { status: "loginConflict", message: null };
  return { status: "ready", message: null };
}

/**
 * Abgleich der geparsten Zeilen mit dem Bestand (#611): vorhandene Nummer →
 * übersprungen, E-Mail eines bestehenden Mitglieds → Gruppe mit Anker (oder
 * Fehler bei einem Kind), E-Mail eines Logins ohne Mitglied → Konflikt.
 * `extraEmails` (vom Admin eingetragene Adressen) werden mitgeprüft, damit
 * `validateImportDecisions` sie serverseitig gegen den Bestand hält.
 */
export async function buildImportPreview(
  rows: MemberImportRow[],
  extraEmails: string[] = [],
  db: DbClient = prisma,
): Promise<MemberImportPreview> {
  const fileEmails = rows
    .map((row) => row.email)
    .filter((email): email is string => email !== null);

  const [existingNumbers, emailOwners, existingGuardianOptions] =
    await Promise.all([
      db.member.findMany({
        where: { memberNumber: { in: rows.map((row) => row.memberNumber) } },
        select: { memberNumber: true },
      }),
      findEmailOwners([...fileEmails, ...extraEmails], db),
      listExistingGuardianOptions(db),
    ]);
  const takenNumbers = new Set(existingNumbers.map((m) => m.memberNumber));

  const newRows = rows.filter((row) => !takenNumbers.has(row.memberNumber));
  const fileGroups = groupByEmail(newRows);
  const previewRows: ImportPreviewRow[] = rows.map((row) =>
    takenNumbers.has(row.memberNumber)
      ? {
          ...row,
          status: "skipped",
          message: "Mitgliedsnummer ist bereits vergeben.",
        }
      : { ...row, ...statusFor(row, emailOwners, new Set(fileGroups.keys())) },
  );

  const groupLines = new Map<string, number[]>();
  for (const row of previewRows) {
    if (row.status !== "group" || !row.email) continue;
    groupLines.set(row.email, [...(groupLines.get(row.email) ?? []), row.line]);
  }
  const optionLabels = new Map(
    existingGuardianOptions.map((option) => [option.id, option.label]),
  );
  const groups: ImportGroup[] = [...groupLines].map(([email, lines]) => {
    const anchorId = emailOwners[email]?.member?.id;
    return {
      email,
      lines,
      anchor: anchorId
        ? {
            memberId: anchorId,
            name:
              optionLabels.get(memberRef(anchorId)) ?? "Bestehendes Mitglied",
          }
        : null,
    };
  });

  return { rows: previewRows, groups, emailOwners, existingGuardianOptions };
}
