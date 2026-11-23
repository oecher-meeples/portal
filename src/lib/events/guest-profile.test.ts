import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { loadGuestVisibleMeepleProfile } = await import("./guest-profile");

function meeple(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    displayName: "Lea",
    profilePictureUrl: "https://blob.example/lea.jpg",
    profilePictureVisibility: "INTERN",
    meepleDatenVisibility: "IMMER",
    bggUsername: "lea_bgg",
    bgaUsername: null,
    telegramHandle: "lea_tg",
    signalHandle: null,
    discordHandle: null,
    address: null,
    shareAddress: false,
    member: { email: "lea@example.com" },
    ...overrides,
  };
}

describe("loadGuestVisibleMeepleProfile", () => {
  it("returns null when the meeple does not exist", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);
    prismaMock.explainerAttendance.findUnique.mockResolvedValue(null);

    expect(await loadGuestVisibleMeepleProfile("m-1", "e-1")).toBeNull();
  });

  it("returns null when meepleDatenVisibility is INTERN", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(
      meeple({ meepleDatenVisibility: "INTERN" }) as never,
    );
    prismaMock.explainerAttendance.findUnique.mockResolvedValue(null);

    expect(await loadGuestVisibleMeepleProfile("m-1", "e-1")).toBeNull();
  });

  it("is visible when IMMER, even without a current attendance", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(meeple() as never);
    prismaMock.explainerAttendance.findUnique.mockResolvedValue(null);

    const result = await loadGuestVisibleMeepleProfile("m-1", "e-1");

    expect(result?.displayName).toBe("Lea");
    expect(result?.contact.telegramHref).toBe("https://t.me/lea_tg");
    expect(result?.contact.mailHref).toBe("mailto:lea@example.com");
  });

  it("requires a current attendance when EVENTS", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(
      meeple({ meepleDatenVisibility: "EVENTS" }) as never,
    );
    prismaMock.explainerAttendance.findUnique.mockResolvedValue(null);

    expect(await loadGuestVisibleMeepleProfile("m-1", "e-1")).toBeNull();

    prismaMock.explainerAttendance.findUnique.mockResolvedValue({
      eventId: "e-1",
      meepleId: "m-1",
    } as never);

    expect(await loadGuestVisibleMeepleProfile("m-1", "e-1")).not.toBeNull();
  });
});
