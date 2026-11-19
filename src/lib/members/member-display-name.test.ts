import { describe, expect, it } from "vitest";
import { memberDisplayName, memberFullName } from "./member-display-name";

describe("memberFullName", () => {
  it("joins first and last name", () => {
    expect(memberFullName({ firstName: "Ada", lastName: "Lovelace" })).toBe(
      "Ada Lovelace",
    );
  });

  it("copes with one missing part and with none", () => {
    expect(memberFullName({ firstName: "Ada", lastName: null })).toBe("Ada");
    expect(memberFullName({ firstName: null, lastName: null })).toBe("");
    expect(memberFullName({})).toBe("");
  });
});

describe("memberDisplayName", () => {
  const base = { lastName: null, firstName: null, email: null, meeple: null };

  it("prefers the full name, then Meeple name, email and member number", () => {
    expect(
      memberDisplayName({ ...base, firstName: "Ada", lastName: "L" }),
    ).toBe("Ada L");
    expect(memberDisplayName({ ...base, meeple: { displayName: "Ada" } })).toBe(
      "Ada",
    );
    expect(memberDisplayName({ ...base, email: "a@b.de" })).toBe("a@b.de");
    expect(memberDisplayName({ ...base, memberNumber: 7 })).toBe(
      "Mitglied Nr. 7",
    );
    expect(memberDisplayName(base)).toBe("Unbekanntes Mitglied");
  });
});
