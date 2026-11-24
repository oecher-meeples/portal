import { describe, expect, it } from "vitest";
import {
  buildImportPlan,
  decisionEmails,
  initialImportDecisions,
  validateImportDecisions,
} from "./member-import-decisions";
import { emptyDecision } from "./member-import-families";
import type {
  ImportDecisions,
  ImportPreviewRow,
  MemberImportPreview,
  RowDecision,
} from "./member-import-types";

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

function adult(email = "", extra: Partial<RowDecision> = {}): RowDecision {
  return emptyDecision({ role: "adult", email, ...extra });
}

function child(extra: Partial<RowDecision> = {}): RowDecision {
  return emptyDecision({ role: "child", ...extra });
}

const OPEN = emptyDecision();

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
      3: OPEN,
      // Gleicher Nachname wie die eine „ready“-Zeile → Familienvorschlag.
      4: emptyDecision({ family: "row:2" }),
      5: adult(),
    });
  });

  it("pre-selects the guardian whose first name is in the shared address", () => {
    const decisions = initialImportDecisions(
      preview({
        rows: [
          row(2, "group", "eva.denysiuk@yahoo.de", "Ansgar"),
          row(3, "group", "eva.denysiuk@yahoo.de", "Eva"),
          row(4, "group", "eva.denysiuk@yahoo.de", "Johann"),
        ],
        groups: [
          { email: "eva.denysiuk@yahoo.de", lines: [2, 3, 4], anchor: null },
        ],
      }),
    );

    expect(decisions[2].role).toBeNull();
    expect(decisions[3].role).toBe("adult");
    expect(decisions[4].role).toBeNull();
  });
});

describe("validateImportDecisions — families", () => {
  it("accepts two guardians (one keeps the address) and a child linked to both", () => {
    const decisions: ImportDecisions = {
      2: adult("", { keepsSharedEmail: true }),
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

  it("lets a single guardian keep the address without choosing", () => {
    const decisions = { 2: adult(), 3: child(), 4: child() };

    expect(validateImportDecisions(FAMILY, decisions)).toEqual([]);
    expect(buildImportPlan(FAMILY, decisions).members[0].email).toBe(
      "fam@example.com",
    );
  });

  it("asks a second guardian for an email or an explicit „leave empty“", () => {
    const decisions = {
      2: adult("", { keepsSharedEmail: true }),
      3: adult(),
      4: child(),
    };

    expect(validateImportDecisions(FAMILY, decisions)).toEqual([
      {
        line: 3,
        message: "E-Mail-Adresse eingeben oder „Erstmal leer lassen“ wählen.",
      },
    ]);
    const deferred = { ...decisions, 3: adult("", { noEmail: true }) };
    expect(validateImportDecisions(FAMILY, deferred)).toEqual([]);
    expect(buildImportPlan(FAMILY, deferred).members[1].email).toBeNull();
  });

  it("blocks when nobody keeps the shared address", () => {
    const issues = validateImportDecisions(FAMILY, {
      2: adult("mutter@example.com"),
      3: adult("vater@example.com"),
      4: child(),
    });

    expect(issues).toEqual([
      expect.objectContaining({
        familyKey: "email:fam@example.com",
        message:
          "Ein:e Erziehungsberechtigte:r muss die gemeinsame Adresse behalten.",
      }),
    ]);
  });

  it("blocks two keepers and a typed copy of the shared address", () => {
    expect(
      validateImportDecisions(FAMILY, {
        2: adult("", { keepsSharedEmail: true }),
        3: adult("", { keepsSharedEmail: true }),
        4: child(),
      }),
    ).toContainEqual(
      expect.objectContaining({
        message: "Nur eine Person kann die gemeinsame Adresse behalten.",
      }),
    );
    const issues = validateImportDecisions(FAMILY, {
      2: adult("", { keepsSharedEmail: true }),
      3: adult("FAM@example.com"),
      4: child(),
    });
    expect(issues.map((issue) => issue.line)).toEqual([2, 3]);
  });

  it("blocks an open role and children without any guardian", () => {
    expect(
      validateImportDecisions(FAMILY, { 2: adult(), 3: OPEN, 4: child() }),
    ).toEqual([{ line: 3, message: "Erziehungsberechtigt oder Kind wählen." }]);
    const noGuardian = validateImportDecisions(FAMILY, {
      2: child(),
      3: child(),
      4: child(),
    });

    expect(noGuardian.map((issue) => issue.message)).toEqual([
      "Die Familie braucht mindestens eine:n Erziehungsberechtigte:n.",
      "Ein:e Erziehungsberechtigte:r muss die gemeinsame Adresse behalten.",
    ]);
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

describe("validateImportDecisions — not importing", () => {
  it("creates neither the row nor guardian links to it, and needs no decision", () => {
    const decisions = {
      2: adult("", { skip: true }),
      3: OPEN,
      4: child(),
    };
    expect(
      validateImportDecisions(FAMILY, decisions).map((issue) => issue.message),
    ).toEqual([
      "Erziehungsberechtigt oder Kind wählen.",
      "Die Familie braucht mindestens eine:n Erziehungsberechtigte:n.",
      "Ein:e Erziehungsberechtigte:r muss die gemeinsame Adresse behalten.",
    ]);

    const decided = { ...decisions, 3: adult() };
    expect(validateImportDecisions(FAMILY, decided)).toEqual([]);
    const plan = buildImportPlan(FAMILY, decided);
    expect(plan.members.map((m) => [m.line, m.email])).toEqual([
      [3, "fam@example.com"],
      [4, null],
    ]);
    expect(plan.guardianLinks).toEqual([{ childLine: 4, guardian: "row:3" }]);
  });
});

describe("validateImportDecisions — moving to another family", () => {
  const MIXED = preview({
    rows: [
      row(2, "needsRole", null, "Kind"),
      row(3, "ready", "bea@example.com", "Bea"),
    ],
  });

  it("requires a family for a child and an open row to be decided", () => {
    expect(
      validateImportDecisions(MIXED, {
        2: child(),
        3: adult("bea@example.com"),
      }),
    ).toEqual([
      { line: 2, message: "Ein Kind muss einer Familie zugewiesen sein." },
    ]);
    expect(
      validateImportDecisions(MIXED, { 2: OPEN, 3: adult("bea@example.com") }),
    ).toEqual([
      {
        line: 2,
        message: "Als Erwachsene:r anlegen oder einer Familie zuweisen.",
      },
    ]);
  });

  it("allows an adult without email outside a family", () => {
    const decisions = { 2: adult(), 3: adult("bea@example.com") };
    expect(validateImportDecisions(MIXED, decisions)).toEqual([]);
    expect(buildImportPlan(MIXED, decisions).members[0].email).toBeNull();
  });

  it("links a child moved to a file adult's family", () => {
    const decisions = {
      2: child({ family: "row:3" }),
      3: adult("bea@example.com"),
    };

    expect(validateImportDecisions(MIXED, decisions)).toEqual([]);
    expect(buildImportPlan(MIXED, decisions).guardianLinks).toEqual([
      { childLine: 2, guardian: "row:3" },
    ]);
  });

  it("links a child moved to an existing member's family", () => {
    const decisions = {
      2: child({ family: "member:anna" }),
      3: adult("bea@example.com"),
    };

    expect(validateImportDecisions(MIXED, decisions)).toEqual([]);
    expect(buildImportPlan(MIXED, decisions).guardianLinks).toEqual([
      { childLine: 2, guardian: "member:anna" },
    ]);
  });

  it("rejects unknown targets", () => {
    const issues = validateImportDecisions(MIXED, {
      2: child({ family: "member:fremd" }),
      3: adult("bea@example.com"),
    });

    expect(issues.map((issue) => issue.message)).toEqual([
      "Gewählte Familie ist ungültig.",
      "Ein Kind muss einer Familie zugewiesen sein.",
    ]);
  });
});

describe("validateImportDecisions — login conflicts", () => {
  const LOGIN = {
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
  };
  const CONFLICT = preview({
    rows: [row(2, "loginConflict", "admin@example.com")],
    emailOwners: LOGIN,
  });

  it("creates with email null when not linked and no other email is given", () => {
    expect(validateImportDecisions(CONFLICT, { 2: adult() })).toEqual([]);
    expect(buildImportPlan(CONFLICT, { 2: adult() }).members[0]).toMatchObject({
      email: null,
      meepleId: null,
    });
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

  it("ignores a link switch without a linkable login", () => {
    const solo = preview({ rows: [row(2, "ready", "a@example.com")] });
    const decisions = { 2: adult("a@example.com", { linkMeeple: true }) };

    expect(validateImportDecisions(solo, decisions)).toEqual([]);
    expect(buildImportPlan(solo, decisions).members[0].meepleId).toBeNull();
  });

  it("lets only the keeper of a login's shared address link it", () => {
    const shared = preview({
      rows: [
        row(2, "group", "admin@example.com", "Mutter"),
        row(3, "group", "admin@example.com", "Kind"),
      ],
      groups: [{ email: "admin@example.com", lines: [2, 3], anchor: null }],
      emailOwners: LOGIN,
    });

    expect(
      validateImportDecisions(shared, { 2: adult(), 3: child() }),
    ).toHaveLength(1);
    const linked = { 2: adult("", { linkMeeple: true }), 3: child() };
    expect(validateImportDecisions(shared, linked)).toEqual([]);
    expect(buildImportPlan(shared, linked).members[0]).toMatchObject({
      email: "admin@example.com",
      meepleId: "meeple-admin",
    });
  });
});

describe("decisionEmails", () => {
  it("returns the normalised non-empty emails, skipping „leave empty“ and skipped rows", () => {
    expect(
      decisionEmails({
        2: adult(" A@Example.com"),
        3: adult(""),
        4: child(),
        5: adult("x@example.com", { noEmail: true }),
        6: adult("y@example.com", { skip: true }),
      }),
    ).toEqual(["a@example.com"]);
  });
});
