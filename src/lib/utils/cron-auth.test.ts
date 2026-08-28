import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

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
