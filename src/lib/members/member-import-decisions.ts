import { isValidEmail } from "@/lib/utils/validate-email";
import { memberFullName } from "@/lib/members/member-display-name";
import type { MemberImportRow } from "@/lib/members/member-import-csv";

/**
 * Vorschau-Typen und Zuordnungsregeln des Mitgliederimports (#611) — rein,
 * damit dieselben Regeln live im Browser (Button-Sperre) und noch einmal
 * serverseitig vor dem Schreiben laufen (`commitMemberImport`). Den Abgleich
 * mit dem Bestand baut `member-import-preview.ts`.
 */

/** - `skipped`: Mitgliedsnummer existiert schon, wird nicht angefasst.
 * - `error`: harter Fehler, wird nicht importiert (`message`).
 * - `ready`: eigene, freie E-Mail — wird ohne Rückfrage angelegt.
 * - `group`: teilt die E-Mail mit anderen Zeilen und/oder einem bestehenden
 *   Mitglied (Anker) — Rolle wählen.
 * - `loginConflict`: E-Mail gehört einem Login ohne Mitglied — verknüpfen
 *   oder andere/keine E-Mail.
 * - `needsRole`: ohne E-Mail und ohne Gruppe — Kind oder erwachsen. */
export type ImportRowStatus =
  "skipped" | "error" | "ready" | "group" | "loginConflict" | "needsRole";

export type ImportPreviewRow = MemberImportRow & {
  status: ImportRowStatus;
  message: string | null;
};

export type ImportGroup = {
  email: string;
  lines: number[];
  /** Bestehendes (Nicht-Kind-)Mitglied mit dieser Adresse — behält sie fest
   * und wird nicht verändert. */
  anchor: { memberId: string; name: string } | null;
};

/** Wem eine E-Mail im Bestand schon gehört. `login.meepleId` ist `null`, wenn
 * das Login (noch) kein Meeple hat — dann ist keine Verknüpfung möglich. */
export type ImportEmailOwner = {
  member: { id: string; isChild: boolean } | null;
  login: {
    meepleId: string | null;
    displayName: string;
    hasMember: boolean;
  } | null;
};

export type MemberImportPreview = {
  rows: ImportPreviewRow[];
  groups: ImportGroup[];
  /** Lowercased E-Mail → Besitzer, nur für tatsächlich vergebene Adressen. */
  emailOwners: Record<string, ImportEmailOwner>;
  /** Bestehende Nicht-Kind-Mitglieder als Erziehungsberechtigten-Kandidaten
   * (`id` = `member:<memberId>`). */
  existingGuardianOptions: { id: string; label: string }[];
};

/** `row:<line>` (Erwachsener aus der Datei) oder `member:<id>` (Bestand) —
 * als String, damit er direkt als `IdCombobox`-Option taugt. */
export type GuardianRef = string;

export type RowDecision = {
  role: "adult" | "child" | null;
  /** Eigene bzw. andere E-Mail eines Erwachsenen; leer = keine. Bei einem
   * Kind ignoriert (Kinder werden ohne E-Mail angelegt). */
  email: string;
  /** Mit dem Login der Zeilen-E-Mail verknüpfen (nur `loginConflict` bzw.
   * Gruppen-Adresse eines Logins). */
  linkMeeple: boolean;
  /** Zusätzliche Erziehungsberechtigte eines Kindes — Gruppenmitglieder und
   * der Anker kommen automatisch dazu. */
  guardians: GuardianRef[];
};

/** Schlüssel = Zeilennummer. Nur angelegt werdende Zeilen haben einen Eintrag. */
export type ImportDecisions = Record<number, RowDecision>;

export type ImportIssue = { line: number; message: string };

export const CREATABLE_STATUSES: ReadonlySet<ImportRowStatus> = new Set([
  "ready",
  "group",
  "loginConflict",
  "needsRole",
]);

export function rowRef(line: number): GuardianRef {
  return `row:${line}`;
}

export function memberRef(memberId: string): GuardianRef {
  return `member:${memberId}`;
}

export function initialImportDecisions(
  preview: MemberImportPreview,
): ImportDecisions {
  const decisions: ImportDecisions = {};
  for (const row of preview.rows) {
    if (!CREATABLE_STATUSES.has(row.status)) continue;
    decisions[row.line] = {
      role:
        row.status === "ready" || row.status === "loginConflict"
          ? "adult"
          : null,
      email: row.status === "ready" ? (row.email ?? "") : "",
      linkMeeple: false,
      guardians: [],
    };
  }
  return decisions;
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function linkableLogin(preview: MemberImportPreview, row: ImportPreviewRow) {
  const login = row.email ? preview.emailOwners[row.email]?.login : null;
  return login?.meepleId && !login.hasMember ? login : null;
}

/** Die E-Mail, mit der eine Zeile angelegt wird — `null` für Kinder und
 * Erwachsene ohne Adresse. */
export function finalEmail(
  row: ImportPreviewRow,
  decision: RowDecision,
): string | null {
  if (decision.role !== "adult") return null;
  if (decision.linkMeeple) return row.email;
  return normalizeEmail(decision.email);
}

function groupOf(preview: MemberImportPreview, row: ImportPreviewRow) {
  return row.status === "group"
    ? (preview.groups.find((group) => group.lines.includes(row.line)) ?? null)
    : null;
}

/** Alle Erziehungsberechtigten eines Kindes: Erwachsene seiner Gruppe, der
 * Anker und die zusätzlich gewählten — ohne Dubletten. */
export function resolveGuardians(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  row: ImportPreviewRow,
): GuardianRef[] {
  const refs = new Set<GuardianRef>(decisions[row.line]?.guardians ?? []);
  const group = groupOf(preview, row);
  if (group) {
    for (const line of group.lines) {
      if (line !== row.line && decisions[line]?.role === "adult") {
        refs.add(rowRef(line));
      }
    }
    if (group.anchor) refs.add(memberRef(group.anchor.memberId));
  }
  return [...refs];
}

function rowLabel(row: MemberImportRow): string {
  return memberFullName(row) || `Mitglied Nr. ${row.memberNumber}`;
}

/** Auswahl für den Erziehungsberechtigten-Picker einer Zeile: Erwachsene der
 * Datei (außer der Zeile selbst) und bestehende Nicht-Kind-Mitglieder. */
export function guardianOptions(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  forLine: number,
): { id: string; label: string }[] {
  const fileAdults = preview.rows
    .filter(
      (row) => row.line !== forLine && decisions[row.line]?.role === "adult",
    )
    .map((row) => ({
      id: rowRef(row.line),
      label: `${rowLabel(row)} (neu, Zeile ${row.line})`,
    }));
  return [...fileAdults, ...preview.existingGuardianOptions];
}

function validateAdultEmail(
  preview: MemberImportPreview,
  row: ImportPreviewRow,
  decision: RowDecision,
  email: string | null,
  issues: ImportIssue[],
) {
  const add = (message: string) => issues.push({ line: row.line, message });
  if (decision.linkMeeple && !linkableLogin(preview, row)) {
    add("Diese Zeile lässt sich mit keinem Konto verknüpfen.");
    return;
  }
  if (!email) {
    // Ausnahme laut #611: Login-Konflikt und Erwachsene ohne Datei-E-Mail
    // dürfen ohne Adresse angelegt werden; in einer Gruppe ist sie Pflicht.
    if (row.status === "group" || row.status === "ready") {
      add("Eigene E-Mail-Adresse fehlt.");
    }
    return;
  }
  if (!isValidEmail(email)) {
    add("E-Mail-Adresse ist ungültig.");
    return;
  }
  const owner = preview.emailOwners[email];
  if (owner?.member) {
    add("E-Mail-Adresse gehört bereits einem Vereinsmitglied.");
  } else if (owner?.login && !decision.linkMeeple) {
    add(
      `E-Mail-Adresse gehört dem Konto „${owner.login.displayName}“ — verknüpfen oder eine andere angeben.`,
    );
  }
}

function validateChild(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  row: ImportPreviewRow,
  issues: ImportIssue[],
) {
  const refs = resolveGuardians(preview, decisions, row);
  if (refs.length === 0) {
    issues.push({
      line: row.line,
      message: "Mindestens ein:e Erziehungsberechtigte:r fehlt.",
    });
  }
  const allowedMembers = new Set(
    preview.existingGuardianOptions.map((option) => option.id),
  );
  const anchor = groupOf(preview, row)?.anchor;
  if (anchor) allowedMembers.add(memberRef(anchor.memberId));
  for (const ref of refs) {
    if (ref.startsWith("member:")) {
      if (!allowedMembers.has(ref)) {
        issues.push({
          line: row.line,
          message:
            "Gewählte:r Erziehungsberechtigte:r ist kein gültiges Mitglied.",
        });
      }
      continue;
    }
    const guardianLine = Number(ref.slice("row:".length));
    const guardianRow = preview.rows.find((r) => r.line === guardianLine);
    if (
      !guardianRow ||
      !CREATABLE_STATUSES.has(guardianRow.status) ||
      decisions[guardianLine]?.role !== "adult"
    ) {
      issues.push({
        line: row.line,
        message: `Erziehungsberechtigte:r aus Zeile ${guardianLine} wird nicht als Erwachsene:r angelegt.`,
      });
    }
  }
}

/** Offene Punkte, die das Anlegen sperren — leer heißt absendbar. */
export function validateImportDecisions(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const creatable = preview.rows.filter((row) =>
    CREATABLE_STATUSES.has(row.status),
  );

  const emailLines = new Map<string, number[]>();
  for (const row of creatable) {
    const decision = decisions[row.line];
    if (!decision?.role) {
      issues.push({ line: row.line, message: "Rolle wählen." });
      continue;
    }
    if (decision.role === "child") {
      validateChild(preview, decisions, row, issues);
      continue;
    }
    const email = finalEmail(row, decision);
    validateAdultEmail(preview, row, decision, email, issues);
    if (email)
      emailLines.set(email, [...(emailLines.get(email) ?? []), row.line]);
  }

  for (const lines of emailLines.values()) {
    if (lines.length < 2) continue;
    for (const line of lines) {
      issues.push({
        line,
        message: "Dieselbe E-Mail-Adresse ist mehreren Erwachsenen zugeordnet.",
      });
    }
  }

  for (const group of preview.groups) {
    if (group.anchor) continue;
    const keeps = (emailLines.get(group.email) ?? []).some((line) =>
      group.lines.includes(line),
    );
    if (!keeps) {
      issues.push({
        line: group.lines[0],
        message:
          "Ein:e Erziehungsberechtigte:r der Gruppe muss die gemeinsame Adresse behalten.",
      });
    }
  }

  return issues.sort((a, b) => a.line - b.line);
}

export type ImportPlanMember = {
  line: number;
  memberNumber: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  meepleId: string | null;
};

export type ImportPlan = {
  members: ImportPlanMember[];
  /** Kind-Zeile → Erziehungsberechtigte (Datei-Zeile oder Bestand). */
  guardianLinks: { childLine: number; guardian: GuardianRef }[];
};

/** Was geschrieben wird — nur nach einer leeren `validateImportDecisions`
 * sinnvoll. */
export function buildImportPlan(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
): ImportPlan {
  const plan: ImportPlan = { members: [], guardianLinks: [] };
  for (const row of preview.rows) {
    const decision = decisions[row.line];
    if (!CREATABLE_STATUSES.has(row.status) || !decision?.role) continue;
    plan.members.push({
      line: row.line,
      memberNumber: row.memberNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      email: finalEmail(row, decision),
      meepleId:
        decision.role === "adult" && decision.linkMeeple
          ? (linkableLogin(preview, row)?.meepleId ?? null)
          : null,
    });
    if (decision.role === "child") {
      for (const guardian of resolveGuardians(preview, decisions, row)) {
        plan.guardianLinks.push({ childLine: row.line, guardian });
      }
    }
  }
  return plan;
}

/** Alle E-Mails, die die Entscheidungen neu ins Spiel bringen — der Server
 * prüft sie vor dem Schreiben gegen den Bestand. */
export function decisionEmails(decisions: ImportDecisions): string[] {
  return Object.values(decisions)
    .map((decision) => normalizeEmail(decision.email))
    .filter((email): email is string => email !== null);
}
