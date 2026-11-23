import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getRateLimitAlerts } = await import("./rate-limit-alerts");

beforeEach(() => {
  prismaMock.rateLimitAttempt.findMany.mockResolvedValue([]);
});

describe("getRateLimitAlerts", () => {
  it("returns nothing when no key is flagged", async () => {
    expect(await getRateLimitAlerts()).toEqual([]);
  });

  it("labels a login key that hit the 8h cap", async () => {
    prismaMock.rateLimitAttempt.findMany.mockResolvedValue([
      { key: "login:email:evil@example.com" },
    ] as never);

    expect(await getRateLimitAlerts()).toEqual([
      {
        kind: "login-cap",
        label: "Login-Sperre (8h) erreicht: evil@example.com",
      },
    ]);
  });

  it("labels an iban-reveal key over the limit", async () => {
    prismaMock.rateLimitAttempt.findMany.mockResolvedValue([
      { key: "iban-reveal:meeple-1" },
    ] as never);

    expect(await getRateLimitAlerts()).toEqual([
      {
        kind: "iban-reveal-limit",
        label: "IBAN-Abruf-Limit überschritten (Meeple-ID meeple-1)",
      },
    ]);
  });
});
