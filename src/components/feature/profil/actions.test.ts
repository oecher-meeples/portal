import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeple: requireMeepleMock };
});

const requestIbanChangeMock = vi.fn();
const requestEmailChangeMock = vi.fn();
vi.mock("@/lib/members/pending-changes", () => ({
  requestIbanChange: (...args: unknown[]) => requestIbanChangeMock(...args),
  requestEmailChange: (...args: unknown[]) => requestEmailChangeMock(...args),
}));

const { requestOwnEmailChange, updateOwnBankDetails, updateOwnProfile } =
  await import("./actions");

const OWN = { id: "meeple-1" };
const OWN_MEMBER = { id: "member-1", resignedAt: null };
const IBAN = "DE89 3704 0044 0532 0130 00";

class RedirectError extends Error {}

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  requireMeepleMock.mockResolvedValue(OWN);
  requestIbanChangeMock.mockReset();
  requestEmailChangeMock.mockReset();
  prismaMock.member.findUnique.mockResolvedValue(OWN_MEMBER as never);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(updateOwnProfile({ displayName: "Lea" })).rejects.toThrow(
      RedirectError,
    );
    await expect(
      updateOwnBankDetails({ accountHolder: "Lea", iban: IBAN }),
    ).rejects.toThrow(RedirectError);
    await expect(requestOwnEmailChange("neu@example.com")).rejects.toThrow(
      RedirectError,
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});

describe("updateOwnProfile", () => {
  it("only ever writes to the own meeple", async () => {
    await updateOwnProfile({
      displayName: "Lea",
      bggUsername: "lea_bgg",
      bgaUsername: "  ",
      telegramHandle: "@lea_tg",
      signalHandle: "",
      discordHandle: null,
      address: "  Musterstraße 1, 52062 Aachen  ",
      shareAddress: true,
      doorbellNote: "",
      privateCollectionVisible: true,
    });

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        displayName: "Lea",
        bggUsername: "lea_bgg",
        bgaUsername: null,
        telegramHandle: "lea_tg",
        signalHandle: null,
        discordHandle: null,
        address: "Musterstraße 1, 52062 Aachen",
        shareAddress: true,
        doorbellNote: null,
        privateCollectionVisible: true,
      },
    });
  });

  it("defaults shareAddress and privateCollectionVisible to false when omitted", async () => {
    await updateOwnProfile({ displayName: "Lea" });

    expect(prismaMock.meeple.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shareAddress: false,
          privateCollectionVisible: false,
        }),
      }),
    );
  });

  it("rejects an empty display name", async () => {
    const result = await updateOwnProfile({ displayName: "   " });

    expect(result).toEqual({ error: "Bitte einen Anzeigenamen angeben." });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});

// #330: das eigentliche Validieren/Speichern der IBAN läuft seit dem
// PendingChange-Umbau in src/lib/members/pending-changes.ts (eigene Tests
// dort) — hier nur die Delegation und das Vereinsmitglied-Gate.
describe("updateOwnBankDetails", () => {
  it("delegates to requestIbanChange for the caller's own Member", async () => {
    requestIbanChangeMock.mockResolvedValue({ success: true });

    const result = await updateOwnBankDetails({
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    expect(result).toEqual({ success: true });
    expect(requestIbanChangeMock).toHaveBeenCalledWith("member-1", {
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });
  });

  it("surfaces the pending-change error unchanged", async () => {
    requestIbanChangeMock.mockResolvedValue({
      error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe.",
    });

    const result = await updateOwnBankDetails({
      accountHolder: "Lea",
      iban: "invalid",
    });

    expect(result).toEqual({
      error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe.",
    });
  });

  it("reports a member without a Vereinsmitglied row instead of throwing", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    const result = await updateOwnBankDetails({
      accountHolder: "Lea",
      iban: IBAN,
    });

    expect(result).toEqual({
      error:
        "Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende dich an den Vorstand.",
    });
    expect(requestIbanChangeMock).not.toHaveBeenCalled();
  });
});

describe("requestOwnEmailChange", () => {
  it("delegates to requestEmailChange for the caller's own Member", async () => {
    requestEmailChangeMock.mockResolvedValue({ success: true });

    const result = await requestOwnEmailChange("neu@example.com");

    expect(result).toEqual({ success: true });
    expect(requestEmailChangeMock).toHaveBeenCalledWith(
      "member-1",
      "neu@example.com",
    );
  });
});
