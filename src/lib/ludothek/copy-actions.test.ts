import { describe, expect, it } from "vitest";
import {
  availableCopyActions,
  isCopyActionAvailable,
  type CopyActionSubject,
} from "./copy-actions";

const MEMBER = { canManageGames: false };
const MANAGER = { canManageGames: true };

describe("availableCopyActions (#548)", () => {
  it("offers Ausleihen and Umlagern for a free copy, nothing person-bound", () => {
    expect(availableCopyActions({ zustand: "frei" }, MEMBER)).toEqual([
      "borrow",
      "relocate",
    ]);
  });

  it("treats a not-yet-sorted copy like a free one", () => {
    expect(availableCopyActions({ zustand: "nicht-erfasst" }, MEMBER)).toEqual([
      "borrow",
      "relocate",
    ]);
  });

  it("offers Weitergeben and Rückgabe to the member holding the copy", () => {
    expect(
      availableCopyActions(
        { zustand: "ausgeliehen-verfuegbar", isMine: true },
        MEMBER,
      ),
    ).toEqual(["give", "return"]);
  });

  it("hides Weitergeben from a member who doesn't hold the copy", () => {
    expect(
      availableCopyActions(
        { zustand: "ausgeliehen-nicht-verfuegbar", isMine: false },
        MEMBER,
      ),
    ).toEqual(["return"]);
  });

  it("lets games:manage pass on any lent copy and adds the admin actions", () => {
    expect(
      availableCopyActions(
        { zustand: "ausgeliehen-verfuegbar", isMine: false },
        MANAGER,
      ),
    ).toEqual([
      "give",
      "return",
      "completeness-check",
      "condition",
      "deinventorise",
    ]);
  });

  it("allows relocating but not borrowing a copy in maintenance", () => {
    expect(availableCopyActions({ zustand: "wartung" }, MEMBER)).toEqual([
      "relocate",
    ]);
  });

  it("offers nothing for a private-collection title", () => {
    expect(availableCopyActions({ zustand: "privat" }, MANAGER)).toEqual([]);
  });

  it("restricts to the given action subset, keeping its order", () => {
    expect(
      availableCopyActions({ zustand: "frei" }, MANAGER, [
        "condition",
        "borrow",
        "give",
      ]),
    ).toEqual(["condition", "borrow"]);
  });
});

describe("isCopyActionAvailable", () => {
  it("keeps the previous unrestricted Weitergeben when isMine is unknown", () => {
    const copy: CopyActionSubject = { zustand: "ausgeliehen-verfuegbar" };
    expect(isCopyActionAvailable("give", copy, MEMBER)).toBe(true);
  });
});
