import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listOpenStammdatenChanges, formatStammdatenDiffSummary } =
  await import("./stammdaten");

beforeEach(() => {
  prismaMock.pendingChange.findMany.mockResolvedValue([]);
});

describe("listOpenStammdatenChanges (#380)", () => {
  it("filters to MEMBER_STAMMDATEN, undecided, for the given member", async () => {
    await listOpenStammdatenChanges("member-1");

    expect(prismaMock.pendingChange.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          memberId: "member-1",
          kind: PendingChangeKind.MEMBER_STAMMDATEN,
          approvedAt: null,
          rejectedAt: null,
        },
      }),
    );
  });
});

describe("formatStammdatenDiffSummary (#380)", () => {
  it("joins every changed field into one readable summary", () => {
    const fieldsJson = JSON.stringify({
      firstName: { old: "Alt", new: "Neu" },
      phone: { old: null, new: "0123" },
    });

    expect(formatStammdatenDiffSummary(fieldsJson)).toBe(
      "Vorname: Neu, Telefon: 0123",
    );
  });

  it("formats a birthDate field as a German date", () => {
    const fieldsJson = JSON.stringify({
      birthDate: { old: null, new: new Date("2015-05-01") },
    });

    expect(formatStammdatenDiffSummary(fieldsJson)).toBe(
      "Geburtsdatum: 1.5.2015",
    );
  });

  it("falls back to an em dash for an empty diff", () => {
    expect(formatStammdatenDiffSummary(null)).toBe("—");
  });
});
