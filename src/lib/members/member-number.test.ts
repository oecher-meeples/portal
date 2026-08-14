import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { setMemberNumber } = await import("@/lib/members/member-number");

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("setMemberNumber", () => {
  it("rejects non-positive or non-integer numbers", async () => {
    expect(await setMemberNumber("meeple-1", 0)).toEqual({
      error: "Die Mitgliedsnummer muss eine positive ganze Zahl sein.",
    });
    expect(await setMemberNumber("meeple-1", -3)).toEqual({
      error: "Die Mitgliedsnummer muss eine positive ganze Zahl sein.",
    });
    expect(await setMemberNumber("meeple-1", 1.5)).toEqual({
      error: "Die Mitgliedsnummer muss eine positive ganze Zahl sein.",
    });
    expect(prismaMock.meeple.findUnique).not.toHaveBeenCalled();
  });

  it("returns an error when the Meeple doesn't exist", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await setMemberNumber("meeple-1", 10)).toEqual({
      error: "Mitglied nicht gefunden.",
    });
  });

  it("is a no-op when the number doesn't change", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      id: "meeple-1",
      memberNumber: 10,
    } as never);

    expect(await setMemberNumber("meeple-1", 10)).toEqual({ success: true });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });

  it("assigns the number directly when it is free", async () => {
    prismaMock.meeple.findUnique
      .mockResolvedValueOnce({ id: "meeple-1", memberNumber: 5 } as never) // the target Meeple
      .mockResolvedValueOnce(null); // no conflicting Meeple holds 10

    expect(await setMemberNumber("meeple-1", 10)).toEqual({ success: true });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { memberNumber: 10 },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("bumps the current holder of the number by +9900 and assigns the number", async () => {
    prismaMock.meeple.findUnique
      .mockResolvedValueOnce({ id: "meeple-a", memberNumber: 5 } as never) // target Meeple A
      .mockResolvedValueOnce({ id: "meeple-b", memberNumber: 10 } as never) // Meeple B currently holds 10
      .mockResolvedValueOnce(null); // 9910 is free

    expect(await setMemberNumber("meeple-a", 10)).toEqual({ success: true });

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-b" },
      data: { memberNumber: 9910 },
    });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-a" },
      data: { memberNumber: 10 },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("refuses the change when even the bumped number is already taken", async () => {
    prismaMock.meeple.findUnique
      .mockResolvedValueOnce({ id: "meeple-a", memberNumber: 5 } as never)
      .mockResolvedValueOnce({ id: "meeple-b", memberNumber: 10 } as never)
      .mockResolvedValueOnce({ id: "meeple-c", memberNumber: 9910 } as never);

    expect(await setMemberNumber("meeple-a", 10)).toEqual({
      error:
        "Die Ausweichnummer 9910 ist bereits vergeben — bitte manuell klären.",
    });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});
