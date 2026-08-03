import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireEnv } from "@/lib/utils/require-env";

describe("requireEnv", () => {
  const key = "REQUIRE_ENV_TEST_VAR";

  beforeEach(() => {
    delete process.env[key];
  });

  afterEach(() => {
    delete process.env[key];
  });

  it("returns the value when the variable is set", () => {
    process.env[key] = "value";
    expect(requireEnv(key)).toBe("value");
  });

  it("throws naming the missing variable", () => {
    expect(() => requireEnv(key)).toThrow(
      "Fehlende Umgebungsvariable: REQUIRE_ENV_TEST_VAR",
    );
  });

  it("throws for an empty string value", () => {
    process.env[key] = "";
    expect(() => requireEnv(key)).toThrow(
      "Fehlende Umgebungsvariable: REQUIRE_ENV_TEST_VAR",
    );
  });
});
