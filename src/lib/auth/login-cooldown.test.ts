import { afterEach, describe, expect, it } from "vitest";
import {
  clearLoginCooldown,
  getLoginCooldownSeconds,
  recordLoginFailureClient,
} from "./login-cooldown";

const EMAIL = "test@example.com";

afterEach(() => {
  localStorage.clear();
});

describe("getLoginCooldownSeconds (#425)", () => {
  it("returns 0 without any recorded failure", () => {
    expect(getLoginCooldownSeconds(EMAIL)).toBe(0);
  });

  it("returns 0 for up to 3 free attempts", () => {
    const now = Date.now();
    recordLoginFailureClient(EMAIL, now);
    recordLoginFailureClient(EMAIL, now);
    recordLoginFailureClient(EMAIL, now);

    expect(getLoginCooldownSeconds(EMAIL, now)).toBe(0);
  });

  it("computes 2^(failCount-4) seconds from the 4th failure on", () => {
    const now = Date.now();
    for (let i = 0; i < 4; i++) recordLoginFailureClient(EMAIL, now);

    // failCount=4 → 2^0 = 1s
    expect(getLoginCooldownSeconds(EMAIL, now)).toBe(1);
  });

  it("caps the cooldown at 8 hours", () => {
    const now = Date.now();
    for (let i = 0; i < 30; i++) recordLoginFailureClient(EMAIL, now);

    expect(getLoginCooldownSeconds(EMAIL, now)).toBe(8 * 60 * 60);
  });

  it("counts down as time passes", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) recordLoginFailureClient(EMAIL, now);
    // failCount=5 → 2^1 = 2s
    expect(getLoginCooldownSeconds(EMAIL, now)).toBe(2);
    expect(getLoginCooldownSeconds(EMAIL, now + 1000)).toBe(1);
    expect(getLoginCooldownSeconds(EMAIL, now + 3000)).toBe(0);
  });

  it("resets after the idle window (10h) even without a successful login", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) recordLoginFailureClient(EMAIL, now);
    expect(getLoginCooldownSeconds(EMAIL, now)).toBeGreaterThan(0);

    expect(getLoginCooldownSeconds(EMAIL, now + 10 * 60 * 60 * 1000)).toBe(0);
  });

  it("scopes the counter per email", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) recordLoginFailureClient(EMAIL, now);

    expect(getLoginCooldownSeconds("other@example.com", now)).toBe(0);
  });

  it("is case- and whitespace-insensitive for the storage key", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) recordLoginFailureClient(EMAIL, now);

    expect(getLoginCooldownSeconds(" TEST@EXAMPLE.com ", now)).toBeGreaterThan(
      0,
    );
  });
});

describe("clearLoginCooldown (#425)", () => {
  it("removes the recorded counter for that email", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) recordLoginFailureClient(EMAIL, now);
    expect(getLoginCooldownSeconds(EMAIL, now)).toBeGreaterThan(0);

    clearLoginCooldown(EMAIL);

    expect(getLoginCooldownSeconds(EMAIL, now)).toBe(0);
  });
});
