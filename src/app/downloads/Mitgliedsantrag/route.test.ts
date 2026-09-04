import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /downloads/Mitgliedsantrag (#423)", () => {
  it("redirects to the current fileUrl of the PUBLIC 'Mitgliedsantrag' download", async () => {
    prismaMock.download.findFirst.mockResolvedValue({
      id: "download-1",
      title: "Mitgliedsantrag",
      fileName: "Mitgliedsantrag-Rev06-2025.pdf",
      fileUrl: "https://blob.example.com/Mitgliedsantrag-Rev06-2025.pdf",
      status: "PUBLIC",
    } as never);

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://blob.example.com/Mitgliedsantrag-Rev06-2025.pdf",
    );
    expect(prismaMock.download.findFirst).toHaveBeenCalledWith({
      where: { title: "Mitgliedsantrag", status: "PUBLIC" },
    });
  });

  it("returns 404 when no matching PUBLIC download exists", async () => {
    prismaMock.download.findFirst.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
  });
});
