import { memberFullName } from "@/lib/members/member-display-name";
import {
  isImportedRow,
  memberRef,
  rowRef,
  type ImportAnchor,
  type ImportDecisions,
  type ImportPreviewRow,
  type MemberImportPreview,
  type PersonRef,
  type RowDecision,
} from "@/lib/members/member-import-types";

/**
 * Familien des Mitgliederimports: Ausgangspunkt sind die E-Mail-Gruppen der
 * Vorschau (samt Anker), dazu kommen die Verschiebungen des Admins („einer
 * anderen Familie zuweisen", `RowDecision.family`). Rein — läuft live im
 * Browser und noch einmal serverseitig vor dem Schreiben.
 */

export type ImportFamily = {
  /** Stabil, solange sich die Zusammensetzung nicht ändert. */
  key: string;
  /** Gemeinsame Adresse der E-Mail-Gruppe, `null` bei Familien, die erst
   * durch eine Verschiebung entstanden sind. */
  email: string | null;
  anchor: ImportAnchor | null;
  /** Zeilen in Dateireihenfolge. */
  lines: number[];
};

class UnionFind {
  private parent = new Map<string, string>();

  find(node: string): string {
    const parent = this.parent.get(node) ?? node;
    if (parent === node) return node;
    const root = this.find(parent);
    this.parent.set(node, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }
}

const EMAIL_NODE = "email:";

function importedRows(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
) {
  return preview.rows.filter((row) => isImportedRow(row, decisions));
}

/** Ob eine Verschiebung auf eine Person zeigt, die es gibt: eine angelegt
 * werdende andere Zeile oder ein bestehendes Nicht-Kind-Mitglied. */
export function isValidFamilyTarget(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  line: number,
  target: PersonRef,
): boolean {
  if (target.startsWith("row:")) {
    const targetLine = Number(target.slice("row:".length));
    return (
      targetLine !== line &&
      importedRows(preview, decisions).some((row) => row.line === targetLine)
    );
  }
  return (
    preview.existingGuardianOptions.some((option) => option.id === target) ||
    preview.groups.some(
      (group) => group.anchor && memberRef(group.anchor.memberId) === target,
    )
  );
}

function anchorFor(
  preview: MemberImportPreview,
  memberNode: string,
): ImportAnchor {
  const memberId = memberNode.slice("member:".length);
  const fromGroup = preview.groups.find(
    (group) => group.anchor?.memberId === memberId,
  )?.anchor;
  const label = preview.existingGuardianOptions.find(
    (option) => option.id === memberNode,
  )?.label;
  return fromGroup ?? { memberId, name: label ?? "Bestehendes Mitglied" };
}

/** Alle Familien: E-Mail-Gruppen (auch wenn nur noch eine Zeile übrig ist),
 * Familien um ein bestehendes Mitglied und durch Verschiebung entstandene
 * Familien aus mindestens zwei Zeilen. */
export function resolveFamilies(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
): ImportFamily[] {
  const uf = new UnionFind();
  const groupOfLine = new Map<number, string>();
  for (const group of preview.groups) {
    const node = EMAIL_NODE + group.email;
    uf.find(node);
    if (group.anchor) uf.union(node, memberRef(group.anchor.memberId));
    for (const line of group.lines) groupOfLine.set(line, node);
  }

  const rows = importedRows(preview, decisions);
  for (const row of rows) {
    const target = decisions[row.line]?.family;
    const node = rowRef(row.line);
    if (target && isValidFamilyTarget(preview, decisions, row.line, target)) {
      uf.union(node, target);
    } else if (groupOfLine.has(row.line)) {
      uf.union(node, groupOfLine.get(row.line)!);
    }
  }

  const components = new Map<
    string,
    { lines: number[]; email: string | null; member: string | null }
  >();
  const componentOf = (node: string) => {
    const root = uf.find(node);
    let component = components.get(root);
    if (!component) {
      component = { lines: [], email: null, member: null };
      components.set(root, component);
    }
    return component;
  };
  for (const row of rows) componentOf(rowRef(row.line)).lines.push(row.line);
  for (const group of preview.groups) {
    const component = componentOf(EMAIL_NODE + group.email);
    component.email = group.email;
    if (group.anchor) component.member = memberRef(group.anchor.memberId);
  }
  for (const row of rows) {
    const target = decisions[row.line]?.family;
    if (
      target?.startsWith("member:") &&
      isValidFamilyTarget(preview, decisions, row.line, target)
    ) {
      componentOf(target).member = target;
    }
  }

  const families: ImportFamily[] = [];
  for (const component of components.values()) {
    if (component.lines.length === 0) continue;
    if (!component.email && !component.member && component.lines.length < 2) {
      continue;
    }
    families.push({
      key: component.email
        ? EMAIL_NODE + component.email
        : (component.member ?? rowRef(Math.min(...component.lines))),
      email: component.email,
      anchor: component.member ? anchorFor(preview, component.member) : null,
      lines: component.lines,
    });
  }
  return families.sort((a, b) => a.lines[0] - b.lines[0]);
}

export function familyOfLine(
  families: ImportFamily[],
  line: number,
): ImportFamily | null {
  return families.find((family) => family.lines.includes(line)) ?? null;
}

/** Familie mit eigener gemeinsamer Adresse, die ein:e Erziehungsberechtigte:r
 * behalten muss (beim Anker bleibt sie beim Bestandsmitglied). */
export function hasSharedEmail(
  family: ImportFamily | null,
): family is ImportFamily & { email: string } {
  return family?.email != null && family.anchor === null;
}

function adultLines(family: ImportFamily, decisions: ImportDecisions) {
  return family.lines.filter((line) => decisions[line]?.role === "adult");
}

/** Wer die gemeinsame Adresse behält: die ausdrücklich Gewählte, sonst der
 * einzige Erwachsene. `null` bei keiner oder mehrdeutiger Wahl. */
export function sharedEmailKeeper(
  family: ImportFamily,
  decisions: ImportDecisions,
): number | null {
  if (!hasSharedEmail(family)) return null;
  const adults = adultLines(family, decisions);
  const chosen = adults.filter((line) => decisions[line]?.keepsSharedEmail);
  if (chosen.length === 1) return chosen[0];
  if (chosen.length === 0 && adults.length === 1) return adults[0];
  return null;
}

/** Alle Erziehungsberechtigten der Kinder einer Familie: ihre Erwachsenen
 * plus der Anker. */
export function familyGuardians(
  family: ImportFamily,
  decisions: ImportDecisions,
): PersonRef[] {
  const refs = adultLines(family, decisions).map(rowRef);
  if (family.anchor) refs.push(memberRef(family.anchor.memberId));
  return refs;
}

/** Anzeigename einer Importzeile — Vor- und Nachname, sonst Platzhalter. */
export function importRowName(row: ImportPreviewRow): string {
  return memberFullName(row) || "(ohne Namen)";
}

function personLabel(row: ImportPreviewRow): string {
  return `${importRowName(row)} (Nr. ${row.memberNumber}${row.email ? `, ${row.email}` : ""})`;
}

/** Auswahl für „einer anderen Familie zuweisen": alle anderen angelegt
 * werdenden Zeilen und bestehenden Mitglieder außerhalb der eigenen Familie. */
export function familyTargetOptions(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  families: ImportFamily[],
  line: number,
): { id: string; label: string }[] {
  const own = familyOfLine(families, line);
  const ownLines = new Set(own?.lines ?? [line]);
  const ownAnchor = own?.anchor ? memberRef(own.anchor.memberId) : null;
  const fileRows = importedRows(preview, decisions)
    .filter((row) => !ownLines.has(row.line))
    .map((row) => ({
      id: rowRef(row.line),
      label: `${personLabel(row)} – neu`,
    }));
  const existing = preview.existingGuardianOptions
    .filter((option) => option.id !== ownAnchor)
    .map((option) => ({ ...option, label: `${option.label} – Bestand` }));
  return [...fileRows, ...existing];
}

/** Zielwert für `RowDecision.family`, wenn eine Zeile per Drag & Drop in
 * eine andere Familie wandert: zurück in die Herkunftsgruppe (`null`), sonst
 * eine nicht verschobene Zeile der Ziel-Familie, ihr Anker oder notfalls
 * ihre erste Zeile. */
export function familyTargetFor(
  preview: MemberImportPreview,
  decisions: ImportDecisions,
  line: number,
  target: ImportFamily,
): PersonRef | null {
  const origin = preview.groups.find((group) => group.lines.includes(line));
  if (origin && origin.email === target.email) return null;
  const others = target.lines.filter((other) => other !== line);
  const settled = others.find((other) => !decisions[other]?.family);
  if (settled !== undefined) return rowRef(settled);
  if (target.anchor) return memberRef(target.anchor.memberId);
  return rowRef(others[0]);
}

/** Kleinbuchstaben ohne Akzente — „ä" zusätzlich als „ae", damit beide
 * Schreibweisen in Adressen treffen. */
function nameVariants(value: string): string[] {
  const lower = value.toLowerCase();
  const strip = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z]/g, "");
  const transliterated = lower
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  return [...new Set([strip(transliterated), strip(lower)])];
}

const MIN_NAME_LENGTH = 3;

/** Vorschlag per Namensabgleich: Taucht der Vorname genau einer Zeile im
 * lokalen Teil der gemeinsamen Adresse auf (`eva.muster@…` → Eva), ist sie
 * vermutlich die erziehungsberechtigte Person. Sonst `null`. */
export function suggestGuardianLine(
  email: string,
  rows: ImportPreviewRow[],
): number | null {
  const local = nameVariants(email.split("@")[0]).join(" ");
  const matches = rows.filter((row) => {
    const firstName = row.firstName?.split(/[\s-]+/)[0] ?? "";
    return nameVariants(firstName).some(
      (variant) => variant.length >= MIN_NAME_LENGTH && local.includes(variant),
    );
  });
  return matches.length === 1 ? matches[0].line : null;
}

function lastNameKey(row: ImportPreviewRow): string | null {
  return row.lastName?.trim().toLowerCase() || null;
}

/** Familienvorschlag für Zeilen ohne E-Mail über den Nachnamen: Gibt es
 * genau eine Familie mit E-Mail (Gruppe oder Einzelzeile) mit diesem
 * Nachnamen, kommen sie dorthin; sonst bilden mehrere Zeilen ohne E-Mail mit
 * gleichem Nachnamen eine neue Familie. Ergebnis: Zeile → `family`-Ziel, als
 * Vorbelegung — per „Zuweisung aufheben" korrigierbar. */
export function suggestNameFamilies(
  preview: MemberImportPreview,
): Map<number, PersonRef> {
  const byName = new Map<string, ImportPreviewRow[]>();
  for (const row of preview.rows) {
    const name = lastNameKey(row);
    if (row.status !== "needsRole" || !name) continue;
    byName.set(name, [...(byName.get(name) ?? []), row]);
  }

  const suggestions = new Map<number, PersonRef>();
  for (const [name, rows] of byName) {
    const units = new Set<PersonRef>();
    for (const group of preview.groups) {
      const named = preview.rows.some(
        (row) => group.lines.includes(row.line) && lastNameKey(row) === name,
      );
      if (named) units.add(rowRef(group.lines[0]));
    }
    for (const row of preview.rows) {
      if (row.status === "ready" && lastNameKey(row) === name) {
        units.add(rowRef(row.line));
      }
    }
    const target =
      units.size === 1
        ? [...units][0]
        : rows.length >= 2
          ? rowRef(rows[0].line)
          : null;
    if (!target) continue;
    for (const row of rows) {
      if (rowRef(row.line) !== target) suggestions.set(row.line, target);
    }
  }
  return suggestions;
}

/** Ausgangszustand einer Zeile — `ready` ist fertig, alles andere offen. */
export function emptyDecision(patch: Partial<RowDecision> = {}): RowDecision {
  return {
    role: null,
    email: "",
    noEmail: false,
    keepsSharedEmail: false,
    linkMeeple: false,
    family: null,
    skip: false,
    ...patch,
  };
}
