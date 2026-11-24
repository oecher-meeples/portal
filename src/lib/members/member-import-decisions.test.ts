import { describe, expect, it } from "vitest";
import {
  buildImportPlan,
  decisionEmails,
  guardianOptions,
  initialImportDecisions,
  validateImportDecisions,
  type ImportDecisions,
  type ImportPreviewRow,
  type MemberImportPreview,
  type RowDecision,
} from "./member-import-decisions";

function row(
  line: number,
  status: ImportPreviewRow["status"],
  email: string | null,
  name = `Person${line}`,
): ImportPreviewRow {
  return {
    line,
    memberNumber: 100 + line,
    firstName: name,
    lastName: "Muster",
    email,
    status,
    message: null,
  };
}

function preview(
  overrides: Partial<MemberImportPreview> = {},
): MemberImportPreview {
  return {
    rows: [],
    groups: [],
    emailOwners: {},
    existingGuardianOptions: [{ id: "member:anna", label: "Anna (Nr. 1)" }],
    ...overrides,
  };
}

function adult(email: string, extra: Partial<RowDecision> = {}): RowDecision {
  return { role: "adult", email, linkMeeple: false, guardians: [], ...extra };
}

function child(guardians: string[] = []): RowDecision {
  return { role: "child", email: "", linkMeeple: false, guardians };
}

const FAMILY = preview({
  rows: [
    row(2, "group", "fam@example.com", "Mutter"),
    row(3, "group", "fam@example.com", "Vater"),
    row(4, "group", "fam@example.com", "Kind"),
  ],
  groups: [{ email: "fam@example.com", lines: [2, 3, 4], anchor: null }],
});

describe("initialImportDecisions", () => {
  it("pre-fills ready rows, leaves group and needsRole rows open", () => {
    const decisions = initialImportDecisions(
      preview({
        rows: [
          row(2, "ready", "a@example.com"),
          row(3, "group", "g@example.com"),
          row(4, "needsRole", null),
          row(5, "loginConflict", "admin@example.com"),
          row(6, "skipped", "s@example.com"),
          row(7, "error", "e@example.com"),
        ],
      }),
    );

    expect(decisions).toEqual({
      2: adult("a@example.com"),
      3: { role: null, email: "", linkMeeple: false, guardians: [] },
      4: { role: null, email: "", linkMeeple: false, guardians: [] },
      5: adult(""),
    });
  });
});

describe("validateImportDecisions — groups", () => {
  it("accepts two guardians (one keeps the address) and a child linked to both", () => {
    const decisions: ImportDecisions = {
      2: adult("fam@example.com"),
      3: adult("vater@example.com"),
      4: child(),
    };

    expect(validateImportDecisions(FAMILY, decisions)).toEqual([]);
    const plan = buildImportPlan(FAMILY, decisions);
    expect(plan.members.map((m) => [m.line, m.email])).toEqual([
      [2, "fam@example.com"],
      [3, "vater@example.com"],
      [4, null],
    ]);
    expect(plan.guardianLinks).toEqual([
      { childLine: 4, guardian: "row:2" },
      { childLine: 4, guardian: "row:3" },
    ]);
  });

  it("blocks a second guardian without an own email", () => {
    const issues = validateImportDecisions(FAMILY, {
      2: adult("fam@example.com"),
      3: adult(""),
      4: child(),
    });

    expect(issues).toEqual([
      { line: 3, message: "Eigene E-Mail-Adresse fehlt." },
    ]);
  });

  it("blocks when nobody keeps the shared address", () => {
    const issues = validateImportDecisions(FAMILY, {
      2: adult("mutter@example.com"),
      3: adult("vater@example.com"),
      4: child(),
    });

    expect(issues).toEqual([
      {
        line: 2,
        message:
          "Ein:e Erziehungsberechtigte:r der Gruppe muss die gemeinsame Adresse behalten.",
      },
    ]);
  });

  it("blocks two guardians keeping the same address", () => {
    const issues = validateImportDecisions(FAMILY, {
      2: adult("fam@example.com"),
      3: adult("FAM@example.com"),
      4: child(),
    });

    expect(issues.map((issue) => issue.line)).toEqual([2, 3]);
  });

  it("blocks an open role", () => {
    const issues = validateImportDecisions(FAMILY, {
      2: adult("fam@example.com"),
      3: { role: null, email: "", linkMeeple: false, guardians: [] },
      4: child(),
    });

    expect(issues).toEqual([{ line: 3, message: "Rolle wählen." }]);
  });

  it("links a new child to an existing anchor member, which keeps the address", () => {
    const anchored = preview({
      rows: [row(2, "group", "anna@example.com", "Kind")],
      groups: [
        {
          email: "anna@example.com",
          lines: [2],
          anchor: { memberId: "anna", name: "Anna" },
        },
      ],
      emailOwners: {
        "anna@example.com": {
          member: { id: "anna", isChild: false },
          login: null,
        },
      },
    });

    expect(validateImportDecisions(anchored, { 2: child() })).toEqual([]);
    expect(buildImportPlan(anchored, { 2: child() })).toEqual({
      members: [expect.objectContaining({ line: 2, email: null })],
      guardianLinks: [{ childLine: 2, guardian: "member:anna" }],
    });
    // Als Erwachsene:r darf die Zeile die Anker-Adresse nicht übernehmen.
    expect(
      validateImportDecisions(anchored, { 2: adult("anna@example.com") }),
    ).toEqual([
      {
        line: 2,
        message: "E-Mail-Adresse gehört bereits einem Vereinsmitglied.",
      },
    ]);
  });
});

describe("validateImportDecisions — rows without email", () => {
  const SOLO = preview({ rows: [row(2, "needsRole", null)] });

  it("requires at least one guardian for a child", () => {
    expect(validateImportDecisions(SOLO, { 2: child() })).toEqual([
      { line: 2, message: "Mindestens ein:e Erziehungsberechtigte:r fehlt." },
    ]);
    expect(
      validateImportDecisions(SOLO, { 2: child(["member:anna"]) }),
    ).toEqual([]);
  });

  it("allows an adult without email", () => {
    expect(validateImportDecisions(SOLO, { 2: adult("") })).toEqual([]);
    expect(buildImportPlan(SOLO, { 2: adult("") }).members[0].email).toBeNull();
  });

  it("rejects an unknown existing member as guardian", () => {
    expect(
      validateImportDecisions(SOLO, { 2: child(["member:fremd"]) }),
    ).toEqual([
      {
        line: 2,
        message:
          "Gewählte:r Erziehungsberechtigte:r ist kein gültiges Mitglied.",
      },
    ]);
  });

  it("cascades: a guardian row that is not created makes the child an issue", () => {
    const withError = preview({
      rows: [row(2, "needsRole", null), row(3, "error", "x@example.com")],
    });

    expect(validateImportDecisions(withError, { 2: child(["row:3"]) })).toEqual(
      [
        {
          line: 2,
          message:
            "Erziehungsberechtigte:r aus Zeile 3 wird nicht als Erwachsene:r angelegt.",
        },
      ],
    );
  });

  it("offers file adults and existing members as guardians, not the row itself", () => {
    const mixed = preview({
      rows: [
        row(2, "needsRole", null),
        row(3, "ready", "b@example.com", "Bea"),
      ],
    });

    expect(
      guardianOptions(mixed, { 2: child(), 3: adult("b@example.com") }, 2),
    ).toEqual([
      { id: "row:3", label: "Bea Muster (neu, Zeile 3)" },
      { id: "member:anna", label: "Anna (Nr. 1)" },
    ]);
  });
});

describe("validateImportDecisions — login conflicts", () => {
  const CONFLICT = preview({
    rows: [row(2, "loginConflict", "admin@example.com")],
    emailOwners: {
      "admin@example.com": {
        member: null,
        login: {
          meepleId: "meeple-admin",
          displayName: "Admin",
          hasMember: false,
        },
      },
      "vergeben@example.com": {
        member: { id: "m", isChild: false },
        login: null,
      },
    },
  });

  it("creates with email null when not linked and no other email is given", () => {
    expect(validateImportDecisions(CONFLICT, { 2: adult("") })).toEqual([]);
    expect(
      buildImportPlan(CONFLICT, { 2: adult("") }).members[0],
    ).toMatchObject({ email: null, meepleId: null });
  });

  it("links the member to the login's meeple when checked", () => {
    const decisions = { 2: adult("", { linkMeeple: true }) };

    expect(validateImportDecisions(CONFLICT, decisions)).toEqual([]);
    expect(buildImportPlan(CONFLICT, decisions).members[0]).toMatchObject({
      email: "admin@example.com",
      meepleId: "meeple-admin",
    });
  });

  it("uses another email when given, but not one that is already taken", () => {
    expect(
      buildImportPlan(CONFLICT, { 2: adult("Neu@Example.com ") }).members[0]
        .email,
    ).toBe("neu@example.com");
    expect(
      validateImportDecisions(CONFLICT, { 2: adult("vergeben@example.com") }),
    ).toHaveLength(1);
    expect(
      validateImportDecisions(CONFLICT, { 2: adult("admin@example.com") }),
    ).toEqual([
      {
        line: 2,
        message:
          "E-Mail-Adresse gehört dem Konto „Admin“ — verknüpfen oder eine andere angeben.",
      },
    ]);
    expect(validateImportDecisions(CONFLICT, { 2: adult("kaputt") })).toEqual([
      { line: 2, message: "E-Mail-Adresse ist ungültig." },
    ]);
  });

  it("refuses linking a row without a linkable login", () => {
    const solo = preview({ rows: [row(2, "ready", "a@example.com")] });

    expect(
      validateImportDecisions(solo, {
        2: adult("a@example.com", { linkMeeple: true }),
      }),
    ).toEqual([
      {
        line: 2,
        message: "Diese Zeile lässt sich mit keinem Konto verknüpfen.",
      },
    ]);
  });
});

describe("decisionEmails", () => {
  it("returns the normalised non-empty emails", () => {
    expect(
      decisionEmails({ 2: adult(" A@Example.com"), 3: adult(""), 4: child() }),
    ).toEqual(["a@example.com"]);
  });
});
