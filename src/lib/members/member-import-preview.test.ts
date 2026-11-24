import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import type { MemberImportRow } from "./member-import-csv";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { buildImportPreview, findEmailOwners } =
  await import("./member-import-preview");

function row(
  line: number,
  memberNumber: number,
  email: string | null,
): MemberImportRow {
  return { line, memberNumber, firstName: "Vor", lastName: "Name", email };
}

type ExistingMember = {
  id: string;
  email: string | null;
  guardians?: number;
  memberNumber?: number;
};

function mockDb({
  numbers = [],
  members = [],
  authUsers = [],
  meeples = [],
}: {
  numbers?: number[];
  members?: ExistingMember[];
  authUsers?: { id: string; email: string; name: string }[];
  meeples?: {
    id: string;
    displayName: string;
    neonAuthUserId: string;
    member: { id: string } | null;
  }[];
}) {
  prismaMock.member.findMany.mockImplementation(((args: {
    where: Record<string, unknown>;
  }) => {
    if ("memberNumber" in args.where) {
      return Promise.resolve(numbers.map((memberNumber) => ({ memberNumber })));
    }
    if ("email" in args.where) {
      return Promise.resolve(
        members.map((m) => ({
          id: m.id,
          email: m.email,
          _count: { guardians: m.guardians ?? 0 },
        })),
      );
    }
    // Erziehungsberechtigten-Kandidaten (keine Kinder)
    return Promise.resolve(
      members
        .filter((m) => !m.guardians)
        .map((m) => ({
          id: m.id,
          memberNumber: m.memberNumber ?? 1,
          firstName: m.id,
          lastName: null,
          email: m.email,
          meeple: null,
        })),
    );
  }) as never);
  prismaMock.authUser.findMany.mockResolvedValue(authUsers as never);
  prismaMock.meeple.findMany.mockResolvedValue(meeples as never);
}

beforeEach(() => mockDb({}));

describe("buildImportPreview", () => {
  it("marks rows with an existing member number as skipped, without touching them", async () => {
    mockDb({ numbers: [76] });

    const preview = await buildImportPreview([
      row(2, 76, "a@example.com"),
      row(3, 77, "b@example.com"),
    ]);

    expect(preview.rows.map((r) => [r.line, r.status])).toEqual([
      [2, "skipped"],
      [3, "ready"],
    ]);
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("groups rows sharing an email, and rows without email need a role", async () => {
    const preview = await buildImportPreview([
      row(2, 1, "fam@example.com"),
      row(3, 2, "fam@example.com"),
      row(4, 3, null),
    ]);

    expect(preview.rows.map((r) => r.status)).toEqual([
      "group",
      "group",
      "needsRole",
    ]);
    expect(preview.groups).toEqual([
      { email: "fam@example.com", lines: [2, 3], anchor: null },
    ]);
  });

  it("anchors a row on an existing non-child member with the same email", async () => {
    mockDb({ members: [{ id: "anna", email: "anna@example.com" }] });

    const preview = await buildImportPreview([row(2, 5, "anna@example.com")]);

    expect(preview.rows[0].status).toBe("group");
    expect(preview.groups).toEqual([
      {
        email: "anna@example.com",
        lines: [2],
        anchor: { memberId: "anna", name: "anna (Nr. 1)" },
      },
    ]);
    expect(preview.existingGuardianOptions).toEqual([
      { id: "member:anna", label: "anna (Nr. 1)" },
    ]);
  });

  it("makes a row an error when its email belongs to an existing child member", async () => {
    mockDb({
      members: [{ id: "kind", email: "kind@example.com", guardians: 1 }],
    });

    const preview = await buildImportPreview([row(2, 5, "kind@example.com")]);

    expect(preview.rows[0]).toMatchObject({ status: "error" });
    expect(preview.groups).toEqual([]);
  });

  it("flags an email owned by a login without member as login conflict", async () => {
    mockDb({
      authUsers: [{ id: "u1", email: "Admin@Example.com", name: "Admin" }],
      meeples: [
        {
          id: "meeple-admin",
          displayName: "Vereinsadmin",
          neonAuthUserId: "u1",
          member: null,
        },
      ],
    });

    const preview = await buildImportPreview([row(2, 5, "admin@example.com")]);

    expect(preview.rows[0].status).toBe("loginConflict");
    expect(preview.emailOwners["admin@example.com"]).toEqual({
      member: null,
      login: {
        meepleId: "meeple-admin",
        displayName: "Vereinsadmin",
        hasMember: false,
      },
    });
  });

  it("looks up all emails in one query per table (no N+1)", async () => {
    await buildImportPreview(
      [row(2, 1, "a@example.com"), row(3, 2, "b@example.com")],
      ["extra@example.com"],
    );

    expect(prismaMock.authUser.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.authUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: {
            in: ["a@example.com", "b@example.com", "extra@example.com"],
            mode: "insensitive",
          },
        },
      }),
    );
  });
});

describe("findEmailOwners", () => {
  it("skips the database for an empty list", async () => {
    expect(await findEmailOwners([])).toEqual({});
    expect(prismaMock.member.findMany).not.toHaveBeenCalled();
  });

  it("marks a login whose meeple already has a member", async () => {
    mockDb({
      authUsers: [{ id: "u1", email: "x@example.com", name: "X" }],
      meeples: [
        {
          id: "m1",
          displayName: "X",
          neonAuthUserId: "u1",
          member: { id: "mem" },
        },
      ],
    });

    expect((await findEmailOwners(["x@example.com"]))["x@example.com"]).toEqual(
      {
        member: null,
        login: { meepleId: "m1", displayName: "X", hasMember: true },
      },
    );
  });
});
