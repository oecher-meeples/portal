import { isValidEmail } from "@/lib/utils/validate-email";
import {
  emptyDecision,
  familyGuardians,
  familyOfLine,
  hasSharedEmail,
  isValidFamilyTarget,
  resolveFamilies,
  sharedEmailKeeper,
  suggestGuardianLine,
  suggestNameFamilies,
  type ImportFamily,
} from "@/lib/members/member-import-families";
import {
  CREATABLE_STATUSES,
  isImportedRow,
  type ImportDecisions,
  type ImportIssue,
  type ImportPreviewRow,
  type MemberImportPreview,
  type PersonRef,
} from "@/lib/members/member-import-types";

/**
 * Zuordnungsregeln des Mitgliederimports (#611) — rein, damit dieselben
 * Regeln live im Browser (Button-Sperre) und noch einmal serverseitig vor dem
 * Schreiben laufen (`commitMemberImport`). Familien kommen aus
 * `member-import-families.ts`, den Abgleich mit dem Bestand baut
 * `member-import-preview.ts`.
 */

/** Startzustand: `ready` und Login-Konflikte sind erwachsen; in einer
 * E-Mail-Gruppe ohne Anker ist die Person vorausgewählt, deren Vorname in
 * der Adresse steckt (`suggestGuardianLine`). Zeilen ohne E-Mail sind über
 * den Nachnamen einer Familie vorgeschlagen (`suggestNameFamilies`). */
export function initialImportDecisions(
  preview: MemberImportPreview,
): ImportDecisions {
  const suggested = new Set<number>();
  for (const group of preview.groups) {
    if (group.anchor) continue;
    const rows = preview.rows.filter((row) => group.lines.includes(row.line));
    const line = suggestGuardianLine(group.email, rows);
    if (line !== null) suggested.add(line);
  }

  const nameFamilies = suggestNameFamilies(preview);
  const decisions: ImportDecisions = {};
  for (const row of preview.rows) {
    if (!CREATABLE_STATUSES.has(row.status)) continue;
    decisions[row.line] = emptyDecision({
      role:
        row.status === "ready" ||
        row.status === "loginConflict" ||
        suggested.has(row.line)
          ? "adult"
          : null,
      email: row.status === "ready" ? (row.email ?? "") : "",
      family: nameFamilies.get(row.line) ?? null,
    });
  }
  return decisions;
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function linkableLoginFor(preview: MemberImportPreview, email: string | null) {
  const login = email ? preview.emailOwners[email]?.login : null;
  return login?.meepleId && !login.hasMember ? login : null;
}

/** Die Adresse, mit der sich eine Zeile verknüpfen ließe: in einer Familie
 * mit gemeinsamer Adresse nur für deren Hüter, sonst die eigene. */
function linkEmail(
  row: ImportPreviewRow,
  family: ImportFamily | null,
  decisions: ImportDecisions,
): string | null {
  if (!hasSharedEmail(family)) return row.email;
  return sharedEmailKeeper(family, decisions) === row.line
    ? family.email
    : null;
}

/** Das Login, mit dem sich die Zeile verknüpfen lässt (hat ein Meeple, aber
 * noch kein Mitglied) — `null`, wenn keins. */
export function linkableLogin(
  preview: MemberImportPreview,
  family: ImportFamily | null,
  decisions: ImportDecisions,
  row: ImportPreviewRow,
) {
  return linkableLoginFor(preview, linkEmail(row, family, decisions));
}

/** Verknüpfung nur, wenn gewählt **und** gerade möglich — ein veralteter
 * Schalter (z. B. nach Wechsel des Hüters) bleibt wirkungslos, statt eine
 * unsichtbare Fehlermeldung zu erzeugen. */
function linksMeeple(
  preview: MemberImportPreview,
  family: ImportFamily | null,
  decisions: ImportDecisions,
  row: ImportPreviewRow,
): boolean {
  return (
    decisions[row.line]?.linkMeeple === true &&
    linkableLogin(preview, family, decisions, row) !== null
  );
}

/** Die E-Mail, mit der eine Zeile angelegt wird — `null` für Kinder und
 * Erwachsene ohne Adresse. */
export function finalEmail(
  preview: MemberImportPreview,
  row: ImportPreviewRow,
  family: ImportFamily | null,
  decisions: ImportDecisions,
): string | null {
  const decision = decisions[row.line];
  if (decision?.role !== "adult") return null;
  if (
    hasSharedEmail(family) &&
    sharedEmailKeeper(family, decisions) === row.line
  ) {
    return family.email;
  }
  if (linksMeeple(preview, family, decisions, row)) {
    return linkEmail(row, family, decisions);
  }
  if (decision.noEmail) return null;
  return normalizeEmail(decision.email);
}

function validateAdultEmail(
  preview: MemberImportPreview,
  context: { family: ImportFamily | null; decisions: ImportDecisions },
  row: ImportPreviewRow,
  email: string | null,
  issues: ImportIssue[],
) {
  const { family, decisions } = context;
  const decision = decisions[row.line];
  const add = (message: string) => issues.push({ line: row.line, message });
  if (!email) {
    if (family && !decision.noEmail) {
      add("E-Mail-Adresse eingeben oder „Erstmal leer lassen“ wählen.");
    } else if (!family && row.status === "ready") {
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
  } else if (owner?.login && !linksMeeple(preview, family, decisions, row)) {
    add(
      `E-Mail-Adresse gehört dem Konto „${owner.login.displayName}“ — verknüpfen oder eine andere angeben.`,
    );
  }
}

function validateFamily(
  family: ImportFamily,
  decisions: ImportDecisions,
  issues: ImportIssue[],
) {
  const add = (message: string) =>
    issues.push({ line: family.lines[0], message, familyKey: family.key });
  const hasChild = family.lines.some(
    (line) => decisions[line]?.role === "child",
  );
  if (hasChild && familyGuardians(family, decisions).length === 0) {
    add("Die Familie braucht mindestens eine:n Erziehungsberechtigte:n.");
  }
  if (!hasSharedEmail(family)) return;
  const keepers = family.lines.filter(
    (line) =>
      decisions[line]?.role === "adult" && decisions[line]?.keepsSharedEmail,
  );
  if (keepers.length > 1) {
    add("Nur eine Person kann die gemeinsame Adresse behalten.");
  } else if (sharedEmailKeeper(family, decisions) === null) {
    add("Ein:e Erziehungsberechtigte:r muss die gemeinsame Adresse behalten.");
  }
}

function roleMessage(family: ImportFamily | null): string {
  return family
    ? "Erziehungsberechtigt oder Kind wählen."
    : "Als Erwachsene:r anlegen oder einer Familie zuweisen.";
}

/** Offene Punkte, die das Anlegen sperren — leer heißt absendbar. */
export function validateImportDecisions(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const families = resolveFamilies(preview, decisions);
  const creatable = preview.rows.filter((row) => isImportedRow(row, decisions));

  const emailLines = new Map<string, number[]>();
  for (const row of creatable) {
    const decision = decisions[row.line];
    const family = familyOfLine(families, row.line);
    if (
      decision?.family &&
      !isValidFamilyTarget(preview, decisions, row.line, decision.family)
    ) {
      issues.push({
        line: row.line,
        message: "Gewählte Familie ist ungültig.",
      });
    }
    if (!decision?.role) {
      issues.push({ line: row.line, message: roleMessage(family) });
      continue;
    }
    if (decision.role === "child") {
      if (!family) {
        issues.push({
          line: row.line,
          message: "Ein Kind muss einer Familie zugewiesen sein.",
        });
      }
      continue;
    }
    const email = finalEmail(preview, row, family, decisions);
    validateAdultEmail(preview, { family, decisions }, row, email, issues);
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

  for (const family of families) validateFamily(family, decisions, issues);

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
  guardianLinks: { childLine: number; guardian: PersonRef }[];
};

/** Was geschrieben wird — nur nach einer leeren `validateImportDecisions`
 * sinnvoll. Kinder werden mit allen Erziehungsberechtigten ihrer Familie
 * verknüpft. */
export function buildImportPlan(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
): ImportPlan {
  const plan: ImportPlan = { members: [], guardianLinks: [] };
  const families = resolveFamilies(preview, decisions);
  for (const row of preview.rows) {
    const decision = decisions[row.line];
    if (!isImportedRow(row, decisions) || !decision?.role) continue;
    const family = familyOfLine(families, row.line);
    plan.members.push({
      line: row.line,
      memberNumber: row.memberNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      email: finalEmail(preview, row, family, decisions),
      meepleId:
        decision.role === "adult" &&
        linksMeeple(preview, family, decisions, row)
          ? (linkableLogin(preview, family, decisions, row)?.meepleId ?? null)
          : null,
    });
    if (decision.role === "child" && family) {
      for (const guardian of familyGuardians(family, decisions)) {
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
    .filter((decision) => !decision.noEmail && !decision.skip)
    .map((decision) => normalizeEmail(decision.email))
    .filter((email): email is string => email !== null);
}
