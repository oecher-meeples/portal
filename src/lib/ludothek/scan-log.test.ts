import { describe, expect, it } from "vitest";
import {
  SERIES_SCAN_LOG_POLICY,
  SINGLE_SCAN_LOG_POLICY,
  addScanLogEntry,
  pruneScanLog,
  scanLogStorageKey,
} from "./scan-log";

type Entry = { key: string; at: number; code: string };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function entry(n: number, at = 0, code = `code-${n}`): Entry {
  return { key: `k-${n}`, at, code };
}

function list(count: number): Entry[] {
  return Array.from({ length: count }, (_, i) => entry(i));
}

describe("addScanLogEntry", () => {
  it("puts the new entry on top and caps the single-scan log at 25", () => {
    const result = addScanLogEntry(list(25), entry(99), SINGLE_SCAN_LOG_POLICY);
    expect(result).toHaveLength(25);
    expect(result[0].key).toBe("k-99");
    expect(result.at(-1)?.key).toBe("k-23");
  });

  it("caps the series log at 50", () => {
    expect(
      addScanLogEntry(list(50), entry(99), SERIES_SCAN_LOG_POLICY),
    ).toHaveLength(50);
  });

  it("moves a duplicate code to the top instead of adding it twice", () => {
    const result = addScanLogEntry(
      [entry(1, 10, "inv-1"), entry(2, 5, "inv-2")],
      entry(3, 20, "inv-2"),
      SINGLE_SCAN_LOG_POLICY,
      (e) => e.code,
    );
    expect(result.map((e) => [e.code, e.at])).toEqual([
      ["inv-2", 20],
      ["inv-1", 10],
    ]);
  });

  it("keeps duplicates without dedupeBy (series bookings)", () => {
    const result = addScanLogEntry(
      [entry(1, 10, "inv-1")],
      entry(2, 20, "inv-1"),
      SERIES_SCAN_LOG_POLICY,
    );
    expect(result).toHaveLength(2);
  });
});

describe("pruneScanLog", () => {
  const now = 1_000 * DAY;

  it("drops single-scan entries older than 24 h", () => {
    const result = pruneScanLog<Entry>(
      [entry(1, now - 23 * HOUR), entry(2, now - 25 * HOUR)],
      SINGLE_SCAN_LOG_POLICY,
      now,
    );
    expect(result.map((e) => e.key)).toEqual(["k-1"]);
  });

  it("drops series entries older than 3 months", () => {
    const result = pruneScanLog<Entry>(
      [entry(1, now - 89 * DAY), entry(2, now - 91 * DAY)],
      SERIES_SCAN_LOG_POLICY,
      now,
    );
    expect(result.map((e) => e.key)).toEqual(["k-1"]);
  });

  it("treats broken storage values as empty", () => {
    expect(pruneScanLog("kaputt", SINGLE_SCAN_LOG_POLICY, now)).toEqual([]);
    expect(
      pruneScanLog(
        [{ key: 1 }, null, entry(1, now)],
        SINGLE_SCAN_LOG_POLICY,
        now,
      ),
    ).toEqual([entry(1, now)]);
  });
});

describe("scanLogStorageKey", () => {
  it("uses one key per mode", () => {
    expect(scanLogStorageKey("receive")).not.toBe(scanLogStorageKey("mark"));
  });
});
