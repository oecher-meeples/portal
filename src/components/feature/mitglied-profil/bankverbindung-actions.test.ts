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

const { revealMemberIban, updateMemberIban } =
  await import("./bankverbindung-actions");

const IBAN = "DE89 3704 0044 0532 0130 00";

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  requireBankReaderMock.mockReset().mockResolvedValue({ id: "kassenwart-1" });
  prismaMock.member.update.mockResolvedValue({ slug: "mitglied-1" } as never);
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
      ibanLast4: string;
    };
    expect(data.accountHolder).toBe("Lea Beispiel");
    expect(data.ibanLast4).toBe("3000");
    expect(decryptSecret(data.ibanEncrypted)).toBe("DE89370400440532013000");
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
