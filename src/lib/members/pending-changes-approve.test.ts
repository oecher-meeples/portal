import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { encryptSecret } from "@/lib/utils/crypto";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendPendingChangeRejectedMailMock = vi.fn();
vi.mock("@/lib/members/pending-change-mail", () => ({
  buildEmailChangeConfirmationLink: () => "",
  sendEmailChangeConfirmationMail: vi.fn(),
  sendPendingChangeRejectedMail: (...args: unknown[]) =>
    sendPendingChangeRejectedMailMock(...args),
}));

const getDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: () => getDefaultInviteDaysMock(),
}));

const {
  approvePendingChange,
  hasOpenInviteForMemberEmail,
  rejectPendingChange,
} = await import("@/lib/members/pending-changes");

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  sendPendingChangeRejectedMailMock.mockReset();
});

describe("approvePendingChange", () => {
  it("rejects an unconfirmed MEMBER_EMAIL request", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
      approvedAt: null,
      rejectedAt: null,
      confirmedAt: null,
    } as never);

    const result = await approvePendingChange("pc-1", "admin-1");

    expect(result.error).toMatch(/bestätigen/);
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("rejects a request already decided", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.IBAN,
      approvedAt: new Date(),
      rejectedAt: null,
    } as never);

    const result = await approvePendingChange("pc-1", "admin-1");

    expect(result.error).toBeDefined();
  });

  it("applies an IBAN change and marks it approved (#357: newValue already encrypted)", async () => {
    const encryptedIban = encryptSecret("DE89370400440532013000");
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.IBAN,
      newValue: encryptedIban,
      newAccountHolder: "Lea Beispiel",
      approvedAt: null,
      rejectedAt: null,
      confirmedAt: null,
    } as never);

    const result = await approvePendingChange("pc-1", "admin-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        accountHolder: "Lea Beispiel",
        ibanEncrypted: encryptedIban,
        ibanFirst2: "DE",
        ibanLast4: "3000",
      },
    });
    expect(prismaMock.pendingChange.update).toHaveBeenCalledWith({
      where: { id: "pc-1" },
      data: { approvedAt: expect.any(Date), approvedByUserId: "admin-1" },
    });
  });

  it("applies a confirmed MEMBER_EMAIL change", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
      newValue: "neu@example.com",
      approvedAt: null,
      rejectedAt: null,
      confirmedAt: new Date(),
    } as never);

    const result = await approvePendingChange("pc-1", "admin-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { email: "neu@example.com" },
    });
  });

  describe("revokeAndReissueInvite (#362)", () => {
    beforeEach(() => {
      prismaMock.pendingChange.findUnique.mockResolvedValue({
        id: "pc-1",
        memberId: "member-1",
        kind: PendingChangeKind.MEMBER_EMAIL,
        newValue: "neu@example.com",
        approvedAt: null,
        rejectedAt: null,
        confirmedAt: new Date(),
      } as never);
      getDefaultInviteDaysMock.mockResolvedValue(7);
      prismaMock.member.findUniqueOrThrow.mockResolvedValue({
        email: "alt@example.com",
      } as never);
    });

    it("revokes the open invite for the old email and issues a new one for the new email", async () => {
      prismaMock.invite.findFirst.mockResolvedValue({
        id: "invite-1",
      } as never);

      await approvePendingChange("pc-1", "admin-1", {
        revokeAndReissueInvite: true,
      });

      expect(prismaMock.invite.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: "alt@example.com" }),
        }),
      );
      expect(prismaMock.invite.update).toHaveBeenCalledWith({
        where: { id: "invite-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prismaMock.invite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "neu@example.com" }),
        }),
      );
    });

    it("does nothing to invites when there is no open one for the old email", async () => {
      prismaMock.invite.findFirst.mockResolvedValue(null);

      await approvePendingChange("pc-1", "admin-1", {
        revokeAndReissueInvite: true,
      });

      expect(prismaMock.invite.update).not.toHaveBeenCalled();
      expect(prismaMock.invite.create).not.toHaveBeenCalled();
    });

    it("leaves the invite untouched when revokeAndReissueInvite is not requested", async () => {
      await approvePendingChange("pc-1", "admin-1");

      expect(prismaMock.invite.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.invite.update).not.toHaveBeenCalled();
      expect(prismaMock.invite.create).not.toHaveBeenCalled();
    });
  });
});

describe("hasOpenInviteForMemberEmail (#362)", () => {
  it("is false when the member does not exist", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await hasOpenInviteForMemberEmail("member-1")).toBe(false);
  });

  it("is false when the member has no email (#373 MiniMeeple)", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: null,
    } as never);

    expect(await hasOpenInviteForMemberEmail("member-1")).toBe(false);
  });

  it("is false without an open invite for the current email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: "aktuell@example.com",
    } as never);
    prismaMock.invite.findFirst.mockResolvedValue(null);

    expect(await hasOpenInviteForMemberEmail("member-1")).toBe(false);
  });

  it("is true with an open invite for the current email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      email: "aktuell@example.com",
    } as never);
    prismaMock.invite.findFirst.mockResolvedValue({ id: "invite-1" } as never);

    expect(await hasOpenInviteForMemberEmail("member-1")).toBe(true);
  });
});

describe("rejectPendingChange", () => {
  it("marks the request rejected and mails the current address", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.IBAN,
      approvedAt: null,
      rejectedAt: null,
      member: { email: "aktuell@example.com" },
    } as never);

    const result = await rejectPendingChange("pc-1", "admin-1", "Unklar");

    expect(result).toEqual({ success: true, memberId: "member-1" });
    expect(sendPendingChangeRejectedMailMock).toHaveBeenCalledWith(
      "aktuell@example.com",
      PendingChangeKind.IBAN,
      "Unklar",
    );
  });

  it("rejects a request already decided", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      approvedAt: new Date(),
      rejectedAt: null,
      member: { email: "x@example.com" },
    } as never);

    const result = await rejectPendingChange("pc-1", "admin-1", "");

    expect(result.error).toBeDefined();
    expect(sendPendingChangeRejectedMailMock).not.toHaveBeenCalled();
  });

  it("passes a null member email through unchanged (#373 MiniMeeple)", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.MEMBER_STAMMDATEN,
      approvedAt: null,
      rejectedAt: null,
      member: { email: null },
    } as never);

    const result = await rejectPendingChange("pc-1", "admin-1", "Unklar");

    expect(result).toEqual({ success: true, memberId: "member-1" });
    expect(sendPendingChangeRejectedMailMock).toHaveBeenCalledWith(
      null,
      PendingChangeKind.MEMBER_STAMMDATEN,
      "Unklar",
    );
  });
});
