import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeNotification,
  isNotificationClosed,
  pruneStaleClosedEntries,
} from "./browser-storage";

afterEach(() => {
  localStorage.clear();
});

describe("isNotificationClosed", () => {
  it("is false when nothing was ever closed", () => {
    expect(isNotificationClosed("manual:1")).toBe(false);
  });

  it("is true forever for a 'yes'-closed notification", () => {
    closeNotification("manual:1", "yes");

    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
    expect(isNotificationClosed("manual:1", farFuture)).toBe(true);
  });

  it("is true for a 'temporary'-closed notification within 18 hours", () => {
    const closedAt = new Date("2026-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(closedAt);
    closeNotification("manual:1", "temporary");
    vi.useRealTimers();

    const soon = new Date(closedAt.getTime() + 17 * 60 * 60 * 1000);
    expect(isNotificationClosed("manual:1", soon)).toBe(true);
  });

  it("reopens a 'temporary'-closed notification after 18 hours", () => {
    const closedAt = new Date("2026-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(closedAt);
    closeNotification("manual:1", "temporary");
    vi.useRealTimers();

    const later = new Date(closedAt.getTime() + 19 * 60 * 60 * 1000);
    expect(isNotificationClosed("manual:1", later)).toBe(false);
  });

  it("treats corrupted JSON as not closed (fail open)", () => {
    localStorage.setItem("notification-closed:manual:1", "not-json{");

    expect(isNotificationClosed("manual:1")).toBe(false);
  });
});

describe("pruneStaleClosedEntries", () => {
  it("removes entries whose id is no longer in the current list", () => {
    closeNotification("manual:1", "yes");
    closeNotification("manual:2", "yes");

    pruneStaleClosedEntries(["manual:1"]);

    expect(isNotificationClosed("manual:1")).toBe(true);
    expect(localStorage.getItem("notification-closed:manual:2")).toBeNull();
  });

  it("leaves unrelated localStorage keys untouched", () => {
    localStorage.setItem("sidebar-pinned", "true");
    closeNotification("manual:1", "yes");

    pruneStaleClosedEntries([]);

    expect(localStorage.getItem("sidebar-pinned")).toBe("true");
  });
});
