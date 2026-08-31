import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { decryptSecret } from "@/lib/utils/crypto";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendEmailChangeConfirmationMailMock = vi.fn();
vi.mock("@/lib/members/pending-change-mail", () => ({
  buildEmailChangeConfirmationLink: (origin: string, token: string) =>
    `${origin}/profil/e-mail-bestaetigen?token=${token}`,
  sendEmailChangeConfirmationMail: (...args: unknown[]) =>
    sendEmailChangeConfirmationMailMock(...args),
  sendPendingChangeRejectedMail: vi.fn(),
}));

vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: vi.fn(),
}));

const { confirmEmailChange, requestEmailChange, requestIbanChange } =
  await import("@/lib/members/pending-changes");

const IBAN = "DE89 3704 0044 0532 0130 00";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  sendEmailChangeConfirmationMailMock.mockReset();
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
