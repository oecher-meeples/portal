import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";
import type {
  ImportDecisions,
  ImportPreviewRow,
  MemberImportPreview,
  RowDecision,
} from "./member-import-decisions";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const buildImportPreviewMock = vi.fn();
vi.mock("@/lib/members/member-import-preview", () => ({
  buildImportPreview: (...args: unknown[]) => buildImportPreviewMock(...args),
}));

const { commitMemberImport } = await import("./member-import-commit");

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

function preview(overrides: Partial<MemberImportPreview>): MemberImportPreview {
  return {
    rows: [],
    groups: [],
    emailOwners: {},
    existingGuardianOptions: [],
    ...overrides,
  };
}

function adult(email: string, extra: Partial<RowDecision> = {}): RowDecision {
  return { role: "adult", email, linkMeeple: false, guardians: [], ...extra };
}

const CHILD: RowDecision = {
  role: "child",
  email: "",
  linkMeeple: false,
  guardians: [],
};

const FAMILY = preview({
  rows: [
    row(2, "group", "fam@example.com", "Mutter"),
    row(3, "group", "fam@example.com", "Vater"),
    row(4, "group", "fam@example.com", "Kind"),
  ],
  groups: [{ email: "fam@example.com", lines: [2, 3, 4], anchor: null }],
});
const FAMILY_DECISIONS: ImportDecisions = {
  2: adult("fam@example.com"),
  3: adult("vater@example.com"),
  4: CHILD,
};

let createdCount = 0;
beforeEach(() => {
  createdCount = 0;
  prismaMock.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prismaMock)) as never);
  prismaMock.member.findUnique.mockResolvedValue(null);
  prismaMock.member.create.mockImplementation((() =>
    Promise.resolve({ id: `new-${++createdCount}` })) as never);
  buildImportPreviewMock.mockReset();
});

describe("commitMemberImport", () => {
  it("creates a family atomically: two adults with own emails, a child linked to both", async () => {
    buildImportPreviewMock.mockResolvedValue(FAMILY);

    const result = await commitMemberImport(FAMILY.rows, FAMILY_DECISIONS);

    expect(result).toEqual({ created: 3 });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.member.create).toHaveBeenNthCalledWith(1, {
      data: {
        memberNumber: 102,
        slug: "mutter-muster",
        email: "fam@example.com",
        firstName: "Mutter",
        lastName: "Muster",
        meepleId: null,
        birthDate: null,
        joinedAt: null,
      },
      select: { id: true },
    });
    expect(prismaMock.member.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({ email: null, memberNumber: 104 }),
      }),
    );
    expect(prismaMock.memberGuardian.create.mock.calls).toEqual([
      [{ data: { childMemberId: "new-3", guardianMemberId: "new-1" } }],
      [{ data: { childMemberId: "new-3", guardianMemberId: "new-2" } }],
    ]);
  });

  it("re-checks typed emails against the database", async () => {
    buildImportPreviewMock.mockResolvedValue(FAMILY);

    await commitMemberImport(FAMILY.rows, FAMILY_DECISIONS);

    expect(buildImportPreviewMock).toHaveBeenCalledWith(FAMILY.rows, [
      "fam@example.com",
      "vater@example.com",
    ]);
  });

  it("aborts without writing when a member number got taken since the preview", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({
        rows: [
          row(2, "skipped", "a@example.com"),
          row(3, "ready", "b@example.com"),
        ],
      }),
    );

    await expect(
      commitMemberImport([], {
        2: adult("a@example.com"),
        3: adult("b@example.com"),
      }),
    ).rejects.toThrow(/Bestand hat sich seit der Vorschau geändert.*Zeile 2/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("aborts without writing while decisions are open", async () => {
    buildImportPreviewMock.mockResolvedValue(FAMILY);

    await expect(
      commitMemberImport(FAMILY.rows, { ...FAMILY_DECISIONS, 3: adult("") }),
    ).rejects.toThrow("Zeile 3: Eigene E-Mail-Adresse fehlt.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("turns a unique-constraint race inside the transaction into a clear message", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({ rows: [row(2, "ready", "a@example.com")] }),
    );
    prismaMock.member.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      commitMemberImport([], { 2: adult("a@example.com") }),
    ).rejects.toThrow(/Es wurde nichts angelegt/);
  });

  it("does not log row contents on unexpected errors", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({ rows: [row(2, "ready", "geheim@example.com", "Geheim")] }),
    );
    prismaMock.member.create.mockRejectedValue(
      new Error("Invalid invocation: { firstName: 'Geheim' }"),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      commitMemberImport([], { 2: adult("geheim@example.com") }),
    ).rejects.toThrow(
      "Der Import ist fehlgeschlagen. Es wurde nichts angelegt.",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/geheim/i);
    consoleError.mockRestore();
  });

  it("links the member to an existing login when chosen", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({
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
        },
      }),
    );

    await commitMemberImport([], { 2: adult("", { linkMeeple: true }) });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "admin@example.com",
          meepleId: "meeple-admin",
        }),
      }),
    );
  });

  it("creates a login-conflict row with email null when no other email is given", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({ rows: [row(2, "loginConflict", "admin@example.com")] }),
    );

    await commitMemberImport([], { 2: adult("") });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null, meepleId: null }),
      }),
    );
  });

  it("links a new child to an existing anchor member without touching it", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({
        rows: [row(2, "group", "anna@example.com", "Kind")],
        groups: [
          {
            email: "anna@example.com",
            lines: [2],
            anchor: { memberId: "anna", name: "Anna" },
          },
        ],
      }),
    );

    await commitMemberImport([], { 2: CHILD });

    expect(prismaMock.memberGuardian.create).toHaveBeenCalledWith({
      data: { childMemberId: "new-1", guardianMemberId: "anna" },
    });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("creates nothing on a second run (all rows skipped)", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({ rows: [row(2, "skipped", "a@example.com")] }),
    );

    expect(await commitMemberImport([], {})).toEqual({ created: 0 });
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("keeps slugs unique within the batch", async () => {
    buildImportPreviewMock.mockResolvedValue(
      preview({
        rows: [
          row(2, "ready", "a@example.com", "Kim"),
          row(3, "ready", "b@example.com", "Kim"),
        ],
      }),
    );

    await commitMemberImport([], {
      2: adult("a@example.com"),
      3: adult("b@example.com"),
    });

    expect(
      prismaMock.member.create.mock.calls.map(
        ([args]) => (args as { data: { slug: string } }).data.slug,
      ),
    ).toEqual(["kim-muster", "kim-muster-2"]);
  });
});
