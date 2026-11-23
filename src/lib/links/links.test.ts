import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listImportantLinks } = await import("@/lib/links/links");

describe("listImportantLinks", () => {
  it("queries all links, oldest first (no manual order)", async () => {
    await listImportantLinks();

    expect(prismaMock.importantLink.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" },
    });
  });
});
