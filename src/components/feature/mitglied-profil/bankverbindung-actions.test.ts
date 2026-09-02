import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { decryptSecret } from "@/lib/utils/crypto";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireBankReaderMock = vi.fn();
const revealMeepleIbanMock = vi.fn();
vi.mock("@/lib/members/bank-access-log", () => ({
  requireBankReader: () => requireBankReaderMock(),
  revealMeepleIban: (...args: unknown[]) => revealMeepleIbanMock(...args),
}));

const assertMaySubmitChangeForMock = vi.fn();
vi.mock("@/lib/members/guardians", () => ({
  assertMaySubmitChangeFor: (...args: unknown[]) =>
    assertMaySubmitChangeForMock(...args),
}));

const requestIbanChangeMock = vi.fn();
vi.mock("@/lib/members/pending-changes", () => ({
  requestIbanChange: (...args: unknown[]) => requestIbanChangeMock(...args),
}));

const { revealMemberIban, updateMemberIban, requestMemberIbanChange } =
  await import("./bankverbindung-actions");

const IBAN = "DE89 3704 0044 0532 0130 00";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  requireBankReaderMock.mockReset().mockResolvedValue({ id: "kassenwart-1" });
  assertMaySubmitChangeForMock.mockReset().mockResolvedValue(undefined);
  requestIbanChangeMock.mockReset().mockResolvedValue({ success: true });
  prismaMock.member.update.mockResolvedValue({ slug: "mitglied-1" } as never);
  prismaMock.member.findUniqueOrThrow.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
});

describe("updateMemberIban (#381)", () => {
  it("requires bank:read", async () => {
    requireBankReaderMock.mockRejectedValue(new Error("/403"));

    await expect(
      updateMemberIban("member-1", { accountHolder: "Lea", iban: IBAN }),
    ).rejects.toThrow();
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("rejects a missing account holder", async () => {
    const result = await updateMemberIban("member-1", {
      accountHolder: " ",
      iban: IBAN,
    });

    expect(result).toEqual({ error: "Bitte den Kontoinhaber angeben." });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid iban", async () => {
    const result = await updateMemberIban("member-1", {
      accountHolder: "Lea",
      iban: "invalid",
    });

    expect(result).toEqual({
      error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe.",
    });
  });

  it("writes the encrypted iban directly, no pending change", async () => {
    const result = await updateMemberIban("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    expect(result).toEqual({ success: true });
    const call = prismaMock.member.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "member-1" });
    const data = call.data as {
      accountHolder: string;
      ibanEncrypted: string;
      ibanFirst2: string;
      ibanLast4: string;
    };
    expect(data.accountHolder).toBe("Lea Beispiel");
    expect(data.ibanFirst2).toBe("DE");
    expect(data.ibanLast4).toBe("3000");
    expect(decryptSecret(data.ibanEncrypted)).toBe("DE89370400440532013000");
  });
});

describe("requestMemberIbanChange (#381)", () => {
  it("submits the request once authorised", async () => {
    const result = await requestMemberIbanChange("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    expect(assertMaySubmitChangeForMock).toHaveBeenCalledWith("member-1");
    expect(result).toEqual({ success: true });
    expect(requestIbanChangeMock).toHaveBeenCalledWith("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });
  });

  it("propagates the authorisation error without submitting", async () => {
    assertMaySubmitChangeForMock.mockRejectedValue(
      new Error(
        "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
      ),
    );

    await expect(
      requestMemberIbanChange("member-1", {
        accountHolder: "Lea Beispiel",
        iban: IBAN,
      }),
    ).rejects.toThrow(
      "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
    );
    expect(requestIbanChangeMock).not.toHaveBeenCalled();
  });
});

describe("revealMemberIban (#381)", () => {
  it("requires bank:read and logs via the shared bank-access-log rule", async () => {
    revealMeepleIbanMock.mockResolvedValue({ success: true, iban: IBAN });

    const result = await revealMemberIban("meeple-1");

    expect(result).toEqual({ success: true, iban: IBAN });
    expect(requireBankReaderMock).toHaveBeenCalled();
    expect(revealMeepleIbanMock).toHaveBeenCalledWith(
      "meeple-1",
      "kassenwart-1",
    );
  });
});
