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

const setMeepleNewsletterPreferenceMock = vi.fn();
vi.mock("@/lib/newsletter/subscribers", () => ({
  setMeepleNewsletterPreference: (...args: unknown[]) =>
    setMeepleNewsletterPreferenceMock(...args),
}));

const {
  exportOwnPersonalData,
  requestOwnDeletion,
  requireOwnMember,
  resignOwnMembership,
  updateNewsletterPreference,
  withdrawOwnDeletionRequest,
} = await import("./own-profile-actions");

const OWN = { id: "meeple-1" };
const OWN_MEMBER = { id: "member-1", resignedAt: null };

class RedirectError extends Error {}

beforeEach(() => {
  requireMeepleMock.mockResolvedValue(OWN);
  findOpenDeletionRequestMock.mockReset();
  findOpenDeletionRequestMock.mockResolvedValue(null);
  prismaMock.member.findUnique.mockResolvedValue(OWN_MEMBER as never);
});

describe("without a session", () => {
  it("writes nothing", async () => {
    requireMeepleMock.mockRejectedValue(new RedirectError("/login"));

    await expect(resignOwnMembership()).rejects.toThrow(RedirectError);
    await expect(exportOwnPersonalData()).rejects.toThrow(RedirectError);
    await expect(requestOwnDeletion()).rejects.toThrow(RedirectError);
    await expect(withdrawOwnDeletionRequest()).rejects.toThrow(RedirectError);
    await expect(
      updateNewsletterPreference({ enabled: true, categories: [] }),
    ).rejects.toThrow(RedirectError);
    expect(collectMeeplePersonalDataMock).not.toHaveBeenCalled();
    expect(prismaMock.deletionRequest.create).not.toHaveBeenCalled();
    expect(setMeepleNewsletterPreferenceMock).not.toHaveBeenCalled();
  });
});

describe("requireOwnMember", () => {
  it("reports a missing Vereinsmitglied row as an error", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await requireOwnMember("meeple-1")).toEqual({
      error:
        "Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende dich an den Vorstand.",
    });
  });
});

describe("updateNewsletterPreference", () => {
  it("delegates to the newsletter domain layer for the own meeple", async () => {
    setMeepleNewsletterPreferenceMock.mockResolvedValue({ success: true });

    const result = await updateNewsletterPreference({
      enabled: true,
      categories: ["NEWS"],
    });

    expect(result).toEqual({ success: true });
    expect(setMeepleNewsletterPreferenceMock).toHaveBeenCalledWith("meeple-1", {
      enabled: true,
      categories: ["NEWS"],
    });
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

describe("resignOwnMembership", () => {
  it("records the resignation and ends the membership at the coming turn of the year", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    const result = await resignOwnMembership();

    expect(result).toEqual({
      success: true,
      membershipEndsAt: new Date("2027-01-01T00:00:00.000Z"),
    });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      data: {
        resignedAt: new Date("2026-07-29T12:00:00Z"),
        membershipEndsAt: new Date("2027-01-01T00:00:00.000Z"),
      },
    });

    vi.useRealTimers();
  });

  it("does not overwrite an existing resignation", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      resignedAt: new Date("2026-02-01T00:00:00Z"),
    } as never);

    const result = await resignOwnMembership();

    expect(result).toEqual({
      error: "Für diese Mitgliedschaft liegt bereits eine Kündigung vor.",
    });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("reports a member without a Vereinsmitglied row instead of throwing", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    const result = await resignOwnMembership();

    expect(result).toEqual({
      error:
        "Für dein Konto liegt noch keine Vereinsmitgliedschaft vor. Bitte wende dich an den Vorstand.",
    });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });
});
