import { describe, expect, it } from "vitest";
import { mostUrgentNotification, mostUrgentType } from "./types";

const INFO = {
  id: "1",
  type: "info" as const,
  closeable: "yes" as const,
  message: "i",
};
const WARNING = {
  id: "2",
  type: "warning" as const,
  closeable: "yes" as const,
  message: "w",
};
const DANGER = {
  id: "3",
  type: "danger" as const,
  closeable: "no" as const,
  message: "d",
};

describe("mostUrgentType", () => {
  it("returns null for an empty list", () => {
    expect(mostUrgentType([])).toBeNull();
  });

  it("picks danger over warning and info", () => {
    expect(mostUrgentType([INFO, WARNING, DANGER])).toBe("danger");
  });

  it("picks warning over info when no danger is present", () => {
    expect(mostUrgentType([INFO, WARNING])).toBe("warning");
  });

  it("returns the only type present", () => {
    expect(mostUrgentType([INFO])).toBe("info");
  });
});

describe("mostUrgentNotification", () => {
  it("returns null for an empty list", () => {
    expect(mostUrgentNotification([])).toBeNull();
  });

  it("returns the most urgent notification, not just its type", () => {
    expect(mostUrgentNotification([INFO, WARNING, DANGER])).toBe(DANGER);
  });

  it("keeps the first among equally urgent notifications", () => {
    const secondInfo = { ...INFO, id: "4" };
    expect(mostUrgentNotification([INFO, secondInfo])).toBe(INFO);
  });
});
