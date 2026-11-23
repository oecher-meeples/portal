import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCronRequest, requireCronAuth } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("accepts the correct bearer token", () => {
    expect(isAuthorizedCronRequest("Bearer secret", "secret")).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(isAuthorizedCronRequest(null, "secret")).toBe(false);
  });

  it("rejects the wrong token", () => {
    expect(isAuthorizedCronRequest("Bearer wrong", "secret")).toBe(false);
  });

  it("rejects a header of a different length without throwing", () => {
    expect(isAuthorizedCronRequest("Bearer x", "much-longer-secret")).toBe(
      false,
    );
  });
});

describe("requireCronAuth", () => {
  afterEach(() => vi.unstubAllEnvs());

  const request = (authorization?: string) =>
    new Request("https://example.com/api/cron/x", {
      headers: authorization ? { authorization } : {},
    });

  it("answers 500 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const denied = requireCronAuth(request("Bearer secret"));

    expect(denied?.status).toBe(500);
    expect(await denied?.json()).toEqual({
      error: "CRON_SECRET is not configured",
    });
  });

  it("answers 401 for a wrong or missing token", () => {
    vi.stubEnv("CRON_SECRET", "secret");

    expect(requireCronAuth(request("Bearer wrong"))?.status).toBe(401);
    expect(requireCronAuth(request())?.status).toBe(401);
  });

  it("returns null for the correct token", () => {
    vi.stubEnv("CRON_SECRET", "secret");

    expect(requireCronAuth(request("Bearer secret"))).toBeNull();
  });
});
