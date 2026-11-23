import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const guardMock = vi.fn();
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    guardMock(...args),
  ),
);

const revealMeepleIbanMock = vi.fn();
const revealPendingIbanChangeMock = vi.fn();
vi.mock("@/lib/members/bank-access-log", () => ({
  revealMeepleIban: (...args: unknown[]) => revealMeepleIbanMock(...args),
  revealPendingIbanChange: (...args: unknown[]) =>
    revealPendingIbanChangeMock(...args),
}));

const { revealMemberIban, revealPendingMemberIban } =
  await import("./iban-reveal-actions");

beforeEach(() => {
  guardMock.mockReset().mockResolvedValue({ id: "meeple-kassenwart" });
  revealMeepleIbanMock.mockReset();
  revealPendingIbanChangeMock.mockReset();
});

describe("revealMemberIban", () => {
  it("checks bank:read and reveals as the acting Meeple", async () => {
    revealMeepleIbanMock.mockResolvedValue({ success: true, iban: "DE00" });

    expect(await revealMemberIban("meeple-1")).toEqual({
      success: true,
      iban: "DE00",
    });
    expect(guardMock).toHaveBeenCalledWith("bank:read");
    expect(revealMeepleIbanMock).toHaveBeenCalledWith(
      "meeple-1",
      "meeple-kassenwart",
    );
  });

  it("reveals nothing without the bank:read permission", async () => {
    guardMock.mockResolvedValue(null);

    await expect(revealMemberIban("meeple-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(revealMeepleIbanMock).not.toHaveBeenCalled();
  });
});

describe("revealPendingMemberIban", () => {
  it("checks bank:read and reveals the pending change as the acting Meeple", async () => {
    revealPendingIbanChangeMock.mockResolvedValue({
      success: true,
      iban: "DE11",
    });

    expect(await revealPendingMemberIban("change-1")).toEqual({
      success: true,
      iban: "DE11",
    });
    expect(guardMock).toHaveBeenCalledWith("bank:read");
    expect(revealPendingIbanChangeMock).toHaveBeenCalledWith(
      "change-1",
      "meeple-kassenwart",
    );
  });

  it("reveals nothing without the bank:read permission", async () => {
    guardMock.mockResolvedValue(null);

    await expect(revealPendingMemberIban("change-1")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(revealPendingIbanChangeMock).not.toHaveBeenCalled();
  });
});
