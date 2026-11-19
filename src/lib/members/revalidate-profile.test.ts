import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { revalidateMemberProfile } = await import("./revalidate-profile");

describe("revalidateMemberProfile", () => {
  it("looks the member up by id and revalidates its profile page", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ slug: "ada" } as never);

    await revalidateMemberProfile({ memberId: "m1" });

    expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
      where: { id: "m1" },
      select: { slug: true },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profil/ada");
    // own profile is also served under /profil (#525)
    expect(revalidatePathMock).toHaveBeenCalledWith("/profil");
  });

  it("looks the member up by meeple id", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ slug: "ada" } as never);

    await revalidateMemberProfile({ meepleId: "p1" });

    expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
      where: { meepleId: "p1" },
      select: { slug: true },
    });
  });

  it("does nothing for a Meeple without a linked member", async () => {
    revalidatePathMock.mockClear();
    prismaMock.member.findUnique.mockResolvedValue(null);

    await revalidateMemberProfile({ meepleId: "p2" });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
