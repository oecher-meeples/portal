import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/members/pending-change-mail", () => ({
  buildEmailChangeConfirmationLink: () => "",
  sendEmailChangeConfirmationMail: vi.fn(),
  sendPendingChangeRejectedMail: vi.fn(),
}));
vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: vi.fn(),
}));

const { approvePendingChange, requestStammdatenChange } =
  await import("@/lib/members/pending-changes");

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("requestStammdatenChange (#379)", () => {
  it("rejects an empty diff", async () => {
    const result = await requestStammdatenChange("member-1", {});

    expect(result).toEqual({ error: "Keine Änderung ausgewählt." });
    expect(prismaMock.pendingChange.create).not.toHaveBeenCalled();
  });

  it("replaces an open request and stores the diff as fieldsJson", async () => {
    const diff = { firstName: { old: "Alt", new: "Neu" } };

    const result = await requestStammdatenChange("member-1", diff);

    expect(result).toEqual({ success: true });
    expect(prismaMock.pendingChange.deleteMany).toHaveBeenCalledWith({
      where: {
        memberId: "member-1",
        kind: PendingChangeKind.MEMBER_STAMMDATEN,
        approvedAt: null,
        rejectedAt: null,
      },
    });
    expect(prismaMock.pendingChange.create).toHaveBeenCalledWith({
      data: {
        memberId: "member-1",
        kind: PendingChangeKind.MEMBER_STAMMDATEN,
        newValue: "",
        fieldsJson: JSON.stringify(diff),
      },
    });
  });
});

describe("approvePendingChange — MEMBER_STAMMDATEN (#379)", () => {
  it("applies every changed field from the diff in one update", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.MEMBER_STAMMDATEN,
      approvedAt: null,
      rejectedAt: null,
      confirmedAt: null,
      fieldsJson: JSON.stringify({
        firstName: { old: "Alt", new: "Neu" },
        phone: { old: null, new: "0123" },
      }),
    } as never);

    const result = await approvePendingChange("pc-1", "admin-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { firstName: "Neu", phone: "0123" },
    });
  });

  it("converts a birthDate field back to a Date (round-tripped through JSON)", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.MEMBER_STAMMDATEN,
      approvedAt: null,
      rejectedAt: null,
      confirmedAt: null,
      fieldsJson: JSON.stringify({
        birthDate: { old: null, new: new Date("2015-05-01") },
      }),
    } as never);

    await approvePendingChange("pc-1", "admin-1");

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { birthDate: new Date("2015-05-01") },
    });
  });
});
