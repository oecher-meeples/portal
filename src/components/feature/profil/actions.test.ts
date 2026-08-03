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

const collectMeeplePersonalDataMock = vi.fn();
vi.mock("@/lib/members/data-export", () => ({
  collectMeeplePersonalData: collectMeeplePersonalDataMock,
}));

const findOpenDeletionRequestMock = vi.fn();
vi.mock("@/lib/members/deletion-requests", () => ({
  findOpenDeletionRequest: findOpenDeletionRequestMock,
}));

const { decryptSecret } = await import("@/lib/utils/crypto");
const {
  clearOwnBankDetails,
  exportOwnPersonalData,
  requestOwnDeletion,
  resignOwnMembership,
  updateOwnBankDetails,
  updateOwnProfile,
  withdrawOwnDeletionRequest,
} = await import("./actions");

const OWN = { id: "meeple-1", resignedAt: null };
const IBAN = "DE89 3704 0044 0532 0130 00";

class RedirectError extends Error {}

beforeEach(() => {
  process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
    "base64",
  );
  requireMeepleMock.mockResolvedValue(OWN);
  findOpenDeletionRequestMock.mockReset();
  findOpenDeletionRequestMock.mockResolvedValue(null);
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
    await expect(clearOwnBankDetails()).rejects.toThrow(RedirectError);
    await expect(resignOwnMembership()).rejects.toThrow(RedirectError);
    await expect(exportOwnPersonalData()).rejects.toThrow(RedirectError);
    await expect(requestOwnDeletion()).rejects.toThrow(RedirectError);
    await expect(withdrawOwnDeletionRequest()).rejects.toThrow(RedirectError);
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(collectMeeplePersonalDataMock).not.toHaveBeenCalled();
    expect(prismaMock.deletionRequest.create).not.toHaveBeenCalled();
  });
});

describe("requestOwnDeletion", () => {
  it("records a request for the own meeple", async () => {
    expect(await requestOwnDeletion()).toEqual({ success: true });
    expect(prismaMock.deletionRequest.create).toHaveBeenCalledWith({
      data: { meepleId: "meeple-1" },
    });
  });

  it("refuses a second request while one is still open", async () => {
    findOpenDeletionRequestMock.mockResolvedValue({ id: "req-1" });

    expect(await requestOwnDeletion()).toEqual({
      error: "Für dich liegt bereits ein offener Löschantrag vor.",
    });
    expect(prismaMock.deletionRequest.create).not.toHaveBeenCalled();
  });

  it("is not blocked by open holdings — the right to ask exists regardless", async () => {
    prismaMock.gameHolding.count.mockResolvedValue(3);

    expect(await requestOwnDeletion()).toEqual({ success: true });
  });
});

describe("withdrawOwnDeletionRequest", () => {
  it("deletes the own open request", async () => {
    findOpenDeletionRequestMock.mockResolvedValue({ id: "req-1" });

    expect(await withdrawOwnDeletionRequest()).toEqual({ success: true });
    expect(prismaMock.deletionRequest.delete).toHaveBeenCalledWith({
      where: { id: "req-1" },
    });
  });

  it("reports when there is nothing to withdraw", async () => {
    expect(await withdrawOwnDeletionRequest()).toEqual({
      error: "Es liegt kein offener Löschantrag vor.",
    });
    expect(prismaMock.deletionRequest.delete).not.toHaveBeenCalled();
  });
});

describe("exportOwnPersonalData", () => {
  it("collects data for the own meeple only, never an id from the caller", async () => {
    collectMeeplePersonalDataMock.mockResolvedValue({
      exportedAt: "2026-08-03T12:00:00.000Z",
      meepleId: "meeple-1",
      hinweise: [],
      daten: {},
    });

    const result = await exportOwnPersonalData();

    expect(collectMeeplePersonalDataMock).toHaveBeenCalledWith("meeple-1");
    expect(result).toMatchObject({ success: true });
  });

  it("reports a missing meeple as an error instead of an empty export", async () => {
    collectMeeplePersonalDataMock.mockResolvedValue(null);

    expect(await exportOwnPersonalData()).toEqual({
      error: "Zu diesem Konto wurden keine Daten gefunden.",
    });
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
      },
    });
  });

  it("rejects an empty display name", async () => {
    const result = await updateOwnProfile({ displayName: "   " });

    expect(result).toEqual({ error: "Bitte einen Anzeigenamen angeben." });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});

describe("updateOwnBankDetails", () => {
  it("persists the iban encrypted and never returns the clear text", async () => {
    const result = await updateOwnBankDetails({
      accountHolder: "Lea Beispiel",
      iban: IBAN,
    });

    expect(result).toEqual({ success: true, ibanLast4: "3000" });
    expect(JSON.stringify(result)).not.toContain("370400440532");

    const { data } = prismaMock.meeple.update.mock.calls[0][0] as {
      data: { ibanEncrypted: string; ibanLast4: string; accountHolder: string };
    };
    expect(data.accountHolder).toBe("Lea Beispiel");
    expect(data.ibanLast4).toBe("3000");
    expect(data.ibanEncrypted).not.toContain("370400440532");
    expect(decryptSecret(data.ibanEncrypted)).toBe("DE89370400440532013000");
  });

  it("rejects an invalid iban", async () => {
    const result = await updateOwnBankDetails({
      accountHolder: "Lea",
      iban: "DE88370400440532013000",
    });

    expect(result).toEqual({
      error: "Diese IBAN ist ungültig. Bitte prüfe die Eingabe.",
    });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });

  it("rejects a missing account holder", async () => {
    const result = await updateOwnBankDetails({
      accountHolder: " ",
      iban: IBAN,
    });

    expect(result).toEqual({ error: "Bitte den Kontoinhaber angeben." });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});

describe("clearOwnBankDetails", () => {
  it("empties every bank field", async () => {
    await clearOwnBankDetails();

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { accountHolder: null, ibanEncrypted: null, ibanLast4: null },
    });
  });
});

describe("resignOwnMembership", () => {
  it("records the resignation and ends the membership at the coming turn of the year", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    const result = await resignOwnMembership();

    expect(result).toEqual({
      success: true,
      membershipEndsAt: new Date("2027-01-01T00:00:00.000Z"),
    });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        resignedAt: new Date("2026-07-29T12:00:00Z"),
        membershipEndsAt: new Date("2027-01-01T00:00:00.000Z"),
      },
    });

    vi.useRealTimers();
  });

  it("does not overwrite an existing resignation", async () => {
    requireMeepleMock.mockResolvedValue({
      id: "meeple-1",
      resignedAt: new Date("2026-02-01T00:00:00Z"),
    });

    const result = await resignOwnMembership();

    expect(result).toEqual({
      error: "Für diese Mitgliedschaft liegt bereits eine Kündigung vor.",
    });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});
