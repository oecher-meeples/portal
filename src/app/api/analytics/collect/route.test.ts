// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { POST } = await import("./route");

const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

function beacon(body: string, headers: Record<string, string> = {}) {
  return new Request("https://portal.de/api/analytics/collect", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      host: "portal.de",
      "user-agent": CHROME_DESKTOP,
      ...headers,
    },
  });
}

describe("POST /api/analytics/collect", () => {
  it("records a valid page view and answers 204", async () => {
    const response = await POST(
      beacon(JSON.stringify({ path: "/ludothek", referrer: null })),
    );

    expect(response.status).toBe(204);
    expect(prismaMock.pageView.create).toHaveBeenCalledWith({
      data: {
        path: "/ludothek",
        referrer: null,
        browser: "Chrome",
        device: "Desktop",
      },
    });
  });

  it("answers neutrally but stores nothing for an invalid path", async () => {
    const response = await POST(
      beacon(JSON.stringify({ path: "<script>alert(1)</script>" })),
    );

    expect(response.status).toBe(204);
    expect(prismaMock.pageView.create).not.toHaveBeenCalled();
  });

  it("stores nothing when the visitor sends Do Not Track", async () => {
    const response = await POST(
      beacon(JSON.stringify({ path: "/" }), { dnt: "1" }),
    );

    expect(response.status).toBe(204);
    expect(prismaMock.pageView.create).not.toHaveBeenCalled();
  });

  it("rejects an oversized body with 413", async () => {
    const response = await POST(
      beacon(JSON.stringify({ path: `/${"a".repeat(5000)}` })),
    );

    expect(response.status).toBe(413);
    expect(prismaMock.pageView.create).not.toHaveBeenCalled();
  });

  it("rejects cross-site beacons with 403", async () => {
    const response = await POST(
      beacon(JSON.stringify({ path: "/" }), { "sec-fetch-site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(prismaMock.pageView.create).not.toHaveBeenCalled();
  });

  it("swallows database errors so tracking never fails loudly", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    prismaMock.pageView.create.mockRejectedValue(new Error("db down"));

    const response = await POST(beacon(JSON.stringify({ path: "/" })));

    expect(response.status).toBe(204);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
