import { describe, expect, it } from "vitest";
import { formatTimePlain } from "@/lib/utils/format";
import { poolEntryTitle, type PoolMeeple } from "./helper-pool-bar";

const entry: PoolMeeple = {
  helperId: "m1",
  isGuest: false,
  displayName: "Anna",
  roleId: "r1",
  availabilityStartsAt: "2026-10-10T08:00:00.000Z",
  availabilityEndsAt: "2026-10-10T12:00:00.000Z",
};

describe("poolEntryTitle", () => {
  const base = `Verfügbar ${formatTimePlain(entry.availabilityStartsAt)}–${formatTimePlain(entry.availabilityEndsAt)}`;

  it("shows only the availability without a comment", () => {
    expect(poolEntryTitle(entry)).toBe(base);
  });

  it("appends the planned hint and the comment", () => {
    expect(
      poolEntryTitle({
        ...entry,
        alreadyPlanned: true,
        comment: "Bin erst ab 10 Uhr da",
      }),
    ).toBe(
      `${base} · Anna ist an diesem Tag bereits verplant. · Kommentar: Bin erst ab 10 Uhr da`,
    );
  });
});
