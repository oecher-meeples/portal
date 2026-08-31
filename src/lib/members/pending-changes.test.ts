import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { decryptSecret, encryptSecret } from "@/lib/utils/crypto";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendEmailChangeConfirmationMailMock = vi.fn();
const sendPendingChangeRejectedMailMock = vi.fn();
vi.mock("@/lib/members/pending-change-mail", () => ({
  buildEmailChangeConfirmationLink: (origin: string, token: string) =>
    `${origin}/mitglied/e-mail-bestaetigen?token=${token}`,
  sendEmailChangeConfirmationMail: (...args: unknown[]) =>
    sendEmailChangeConfirmationMailMock(...args),
  sendPendingChangeRejectedMail: (...args: unknown[]) =>
    sendPendingChangeRejectedMailMock(...args),
}));

const getDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: () => getDefaultInviteDaysMock(),
}));

const {
  approvePendingChange,
  confirmEmailChange,
  hasOpenInviteForMemberEmail,
  rejectPendingChange,
  requestEmailChange,
  requestIbanChange,
  requestIbanClearing,
} = await import("@/lib/members/pending-changes");

const IBAN = "DE89 3704 0044 0532 0130 00";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  sendEmailChangeConfirmationMailMock.mockReset();
  sendPendingChangeRejectedMailMock.mockReset();
});

describe("requestIbanChange", () => {
  it("rejects an invalid iban", async () => {
    const result = await requestIbanChange("member-1", {
      accountHolder: "Lea",
      iban: "invalid",
    });

    expect(result).toEqual({
      error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe.",
    });
    expect(prismaMock.pendingChange.create).not.toHaveBeenCalled();
  });

  it("rejects a missing account holder", async () => {
    const result = await requestIbanChange("member-1", {
      accountHolder: " ",
      iban: IBAN,
    });

    expect(result).toEqual({ error: "Bitte den Kontoinhaber angeben." });
  });

  it("replaces an open request and creates a new one", async () => {
    const result = await requestIbanChange("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.pendingChange.deleteMany).toHaveBeenCalledWith({
      where: {
        memberId: "member-1",
        kind: PendingChangeKind.IBAN,
        approvedAt: null,
        rejectedAt: null,
      },
    });
    expect(prismaMock.pendingChange.create).toHaveBeenCalledWith({
      data: {
        memberId: "member-1",
        kind: PendingChangeKind.IBAN,
        newValue: expect.any(String),
        newAccountHolder: "Lea Beispiel",
      },
    });
  });

  it("never stores newValue as plaintext (#357)", async () => {
    await requestIbanChange("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    const stored = prismaMock.pendingChange.create.mock.calls[0][0].data
      .newValue as string;
    expect(stored).not.toBe("DE89370400440532013000");
    expect(decryptSecret(stored)).toBe("DE89370400440532013000");
  });
});

describe("requestIbanClearing", () => {
  it("rejects clearing for an active membership", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      resignedAt: null,
    } as never);

    const result = await requestIbanClearing("member-1");

    expect(result.error).toMatch(/gekündigt/);
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("clears bank fields for a resigned membership", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      resignedAt: new Date(),
    } as never);

    const result = await requestIbanClearing("member-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { accountHolder: null, ibanEncrypted: null, ibanLast4: null },
    });
  });
});

describe("requestEmailChange", () => {
  it("rejects an invalid email", async () => {
    const result = await requestEmailChange("member-1", "not-an-email");

    expect(result).toEqual({ error: "Ungültige E-Mail-Adresse." });
  });

  it("rejects an email already used by another member", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "other-member",
    } as never);

    const result = await requestEmailChange("member-1", "taken@example.com");

    expect(result).toEqual({
      error: "Diese E-Mail-Adresse wird bereits verwendet.",
    });
  });

  it("creates the request and sends the confirmation mail", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);
    prismaMock.pendingChange.create.mockResolvedValue({
      confirmToken: "tok-123",
    } as never);

    const result = await requestEmailChange("member-1", "Neu@Example.com");

    expect(result).toEqual({ success: true });
    expect(sendEmailChangeConfirmationMailMock).toHaveBeenCalledWith(
      "neu@example.com",
      expect.stringContaining("token=tok-123"),
    );
  });
});

describe("confirmEmailChange", () => {
  it("rejects an unknown token", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue(null);

    const result = await confirmEmailChange("unknown");

    expect(result.error).toBeDefined();
  });

  it("rejects an already-rejected request", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
      rejectedAt: new Date(),
    } as never);

    const result = await confirmEmailChange("tok-123");

    expect(result.error).toMatch(/abgelehnt/);
  });

  it("marks the request confirmed and burns the token", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
      rejectedAt: null,
    } as never);

    const result = await confirmEmailChange("tok-123");

    expect(result).toEqual({ success: true });
    expect(prismaMock.pendingChange.update).toHaveBeenCalledWith({
      where: { id: "pc-1" },
      data: { confirmedAt: expect.any(Date), confirmToken: null },
    });
  });
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
});
