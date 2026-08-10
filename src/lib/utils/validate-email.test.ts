import { describe, expect, it } from "vitest";
import { isValidEmail } from "./validate-email";

describe("isValidEmail", () => {
  it.each([
    "person@example.com",
    "person.name+tag@sub.example.co.uk",
    "  person@example.com  ",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "not-an-email",
    "person@",
    "@example.com",
    "person example.com",
  ])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
