import { describe, expect, it } from "vitest";
import {
  emptyDecision,
  familyTargetFor,
  familyTargetOptions,
  resolveFamilies,
  sharedEmailKeeper,
  suggestGuardianLine,
  suggestNameFamilies,
} from "./member-import-families";
import type {
  ImportDecisions,
  ImportPreviewRow,
  MemberImportPreview,
} from "./member-import-types";

function row(
  line: number,
  status: ImportPreviewRow["status"],
  email: string | null,
  firstName = `Person${line}`,
): ImportPreviewRow {
  return {
    line,
    memberNumber: 100 + line,
    firstName,
    lastName: "Muster",
    email,
    status,
    message: null,
  };
}

const PREVIEW: MemberImportPreview = {
  rows: [
    row(2, "group", "fam@example.com", "Mutter"),
    row(3, "group", "fam@example.com", "Kind"),
    row(4, "needsRole", null, "Lose"),
    row(5, "ready", "bea@example.com", "Bea"),
    row(6, "group", "anna@example.com", "Annakind"),
    row(7, "error", "x@example.com"),
  ],
  groups: [
    { email: "fam@example.com", lines: [2, 3], anchor: null },
    {
      email: "anna@example.com",
      lines: [6],
      anchor: { memberId: "anna", name: "Anna (Nr. 1)" },
    },
  ],
  emailOwners: {},
  existingGuardianOptions: [
    { id: "member:anna", label: "Anna (Nr. 1)" },
    { id: "member:otto", label: "Otto (Nr. 9)" },
  ],
};

function decisions(patch: ImportDecisions = {}): ImportDecisions {
  const base: ImportDecisions = {};
  for (const line of [2, 3, 4, 5, 6]) base[line] = emptyDecision();
  return { ...base, ...patch };
}

describe("resolveFamilies", () => {
  it("starts from the email groups, including anchored single rows", () => {
    expect(resolveFamilies(PREVIEW, decisions())).toEqual([
      {
        key: "email:fam@example.com",
        email: "fam@example.com",
        anchor: null,
        lines: [2, 3],
      },
      {
        key: "email:anna@example.com",
        email: "anna@example.com",
        anchor: { memberId: "anna", name: "Anna (Nr. 1)" },
        lines: [6],
      },
    ]);
  });

  it("moves a row out of its group into the target's group", () => {
    const families = resolveFamilies(
      PREVIEW,
      decisions({ 3: emptyDecision({ family: "row:6" }) }),
    );

    expect(families.map((family) => family.lines)).toEqual([[2], [3, 6]]);
  });

  it("forms a new family around a row or an existing member", () => {
    const families = resolveFamilies(
      PREVIEW,
      decisions({
        4: emptyDecision({ family: "row:5" }),
        3: emptyDecision({ family: "member:otto" }),
      }),
    );

    expect(families).toEqual([
      expect.objectContaining({ key: "email:fam@example.com", lines: [2] }),
      {
        key: "member:otto",
        email: null,
        anchor: { memberId: "otto", name: "Otto (Nr. 9)" },
        lines: [3],
      },
      { key: "row:4", email: null, anchor: null, lines: [4, 5] },
      expect.objectContaining({ key: "email:anna@example.com" }),
    ]);
  });

  it("follows chains and ignores invalid targets", () => {
    const families = resolveFamilies(
      PREVIEW,
      decisions({
        4: emptyDecision({ family: "row:3" }),
        5: emptyDecision({ family: "row:4" }),
        6: emptyDecision({ family: "row:7" }),
      }),
    );

    expect(families.map((family) => family.lines)).toEqual([[2, 3, 4, 5], [6]]);
  });
});

describe("sharedEmailKeeper", () => {
  const [fam, anchored] = resolveFamilies(PREVIEW, decisions());
  const adult = emptyDecision({ role: "adult" });

  it("is the only adult or the explicitly chosen one", () => {
    expect(sharedEmailKeeper(fam, decisions({ 2: adult }))).toBe(2);
    expect(
      sharedEmailKeeper(fam, decisions({ 2: adult, 3: adult })),
    ).toBeNull();
    expect(
      sharedEmailKeeper(
        fam,
        decisions({ 2: adult, 3: { ...adult, keepsSharedEmail: true } }),
      ),
    ).toBe(3);
  });

  it("is nobody in an anchored family", () => {
    expect(sharedEmailKeeper(anchored, decisions({ 6: adult }))).toBeNull();
  });
});

describe("skipped rows", () => {
  it("leave their family, drop empty families and are no target", () => {
    const skipped = decisions({
      2: emptyDecision({ skip: true }),
      6: emptyDecision({ skip: true }),
      4: emptyDecision({ family: "row:2" }),
    });
    const families = resolveFamilies(PREVIEW, skipped);

    expect(families.map((family) => family.lines)).toEqual([[3]]);
    expect(
      familyTargetOptions(PREVIEW, skipped, families, 3).map((o) => o.id),
    ).toEqual(["row:4", "row:5", "member:anna", "member:otto"]);
  });
});

describe("familyTargetOptions", () => {
  it("offers everyone outside the own family, new rows and existing members", () => {
    const all = decisions();
    const families = resolveFamilies(PREVIEW, all);

    expect(
      familyTargetOptions(PREVIEW, all, families, 6).map((option) => option.id),
    ).toEqual(["row:2", "row:3", "row:4", "row:5", "member:otto"]);
    expect(familyTargetOptions(PREVIEW, all, families, 4)[0]).toEqual({
      id: "row:2",
      label: "Mutter Muster (Nr. 102, fam@example.com) – neu",
    });
  });
});

describe("familyTargetFor (Drag & Drop)", () => {
  it("returns home with null, otherwise points at a settled member", () => {
    const moved = decisions({ 3: emptyDecision({ family: "row:5" }) });
    const families = resolveFamilies(PREVIEW, moved);
    const fam = families.find((f) => f.key === "email:fam@example.com")!;
    const bea = families.find((f) => f.lines.includes(5))!;
    const anchored = families.find((f) => f.anchor)!;

    expect(familyTargetFor(PREVIEW, moved, 3, fam)).toBeNull();
    expect(familyTargetFor(PREVIEW, moved, 4, bea)).toBe("row:5");
    expect(familyTargetFor(PREVIEW, moved, 4, fam)).toBe("row:2");
    expect(
      familyTargetFor(
        PREVIEW,
        decisions({ 6: emptyDecision({ family: "row:4" }) }),
        2,
        {
          key: "member:anna",
          email: null,
          anchor: anchored.anchor,
          lines: [6],
        },
      ),
    ).toBe("member:anna");
  });
});

describe("suggestNameFamilies", () => {
  const named = (
    line: number,
    status: ImportPreviewRow["status"],
    email: string | null,
    lastName: string,
  ): ImportPreviewRow => ({ ...row(line, status, email), lastName });
  const suggest = (rows: ImportPreviewRow[], groups = PREVIEW.groups) =>
    Object.fromEntries(suggestNameFamilies({ ...PREVIEW, rows, groups }));

  it("puts a row without email next to the one family with that last name", () => {
    expect(
      suggest([
        named(2, "ready", "eva@example.com", "Nimtsch"),
        named(3, "needsRole", null, "Nimtsch"),
        named(4, "needsRole", null, "Schmidt"),
      ]),
    ).toEqual({ 3: "row:2" });
  });

  it("joins rows of an email group by last name", () => {
    expect(
      suggest(
        [
          named(2, "group", "fam@example.com", "Muster"),
          named(3, "group", "fam@example.com", "Muster"),
          named(4, "needsRole", null, "muster "),
        ],
        [{ email: "fam@example.com", lines: [2, 3], anchor: null }],
      ),
    ).toEqual({ 4: "row:2" });
  });

  it("groups rows without email among themselves, but not an ambiguous name", () => {
    expect(
      suggest([
        named(2, "needsRole", null, "Nimtsch"),
        named(3, "needsRole", null, "Nimtsch"),
        named(4, "needsRole", null, "Solo"),
      ]),
    ).toEqual({ 3: "row:2" });
    expect(
      suggest([
        named(2, "ready", "a@example.com", "Muster"),
        named(3, "ready", "b@example.com", "Muster"),
        named(4, "needsRole", null, "Muster"),
      ]),
    ).toEqual({});
  });
});

describe("suggestGuardianLine", () => {
  const rows = (...names: string[]) =>
    names.map((name, index) => row(index + 2, "group", "x", name));

  it("finds the first name in the local part, umlauts both ways", () => {
    expect(
      suggestGuardianLine(
        "eva.denysiuk@yahoo.de",
        rows("Ansgar", "Eva", "Johann"),
      ),
    ).toBe(3);
    expect(
      suggestGuardianLine("juergen@example.com", rows("Jürgen", "Mia")),
    ).toBe(2);
    expect(
      suggestGuardianLine("jurgen@example.com", rows("Jürgen", "Mia")),
    ).toBe(2);
    expect(
      suggestGuardianLine("anna-lena.x@example.com", rows("Anna-Lena", "Tom")),
    ).toBe(2);
  });

  it("suggests nobody on no match, several matches or too short names", () => {
    expect(
      suggestGuardianLine("familie@example.com", rows("Eva", "Tom")),
    ).toBeNull();
    expect(
      suggestGuardianLine("evatom@example.com", rows("Eva", "Tom")),
    ).toBeNull();
    expect(suggestGuardianLine("al@example.com", rows("Al", "Tom"))).toBeNull();
  });
});
