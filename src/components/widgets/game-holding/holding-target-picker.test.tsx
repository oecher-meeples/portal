import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let nextScannedText = "";
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned(nextScannedText)}>
      simulate-scan
    </button>
  ),
}));

const { HoldingTargetPicker, matchScannedTarget, unitTargets, meepleTargets } =
  await import("./holding-target-picker");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const UNITS = unitTargets([
  { id: "unit-1", code: "OM-BOX-1", label: "Kiste 1" },
  { id: "unit-10", code: "OM-BOX-10", label: "Kiste 10" },
]);
const MEEPLES = meepleTargets([
  { id: "m-1", displayName: "Max Demo" },
  { id: "m-2", displayName: "Maria Demo" },
]);

describe("matchScannedTarget", () => {
  it("matches a unit label exactly by code, never by prefix", () => {
    expect(matchScannedTarget(UNITS, "OM-BOX-1")).toEqual({
      id: "unit-1",
      source: "scan",
    });
    expect(
      matchScannedTarget(UNITS, "https://short.oecher-meeples.org/id/box-10"),
    ).toEqual({ id: "unit-10", source: "scan" });
    expect(matchScannedTarget(UNITS, "OM-BOX-2")).toBeNull();
  });

  it("matches a personal QR code by id and marks it as meeple-qr", () => {
    expect(matchScannedTarget(MEEPLES, "OM-MEEPLE-m-2")).toEqual({
      id: "m-2",
      source: "meeple-qr",
    });
  });

  it("accepts free text only as an exact or unique partial match", () => {
    expect(matchScannedTarget(MEEPLES, "max demo")?.id).toBe("m-1");
    expect(matchScannedTarget(MEEPLES, "Maria")?.id).toBe("m-2");
    expect(matchScannedTarget(MEEPLES, "Demo")).toBeNull();
  });
});

describe("HoldingTargetPicker", () => {
  it("picks the scanned target right away", () => {
    nextScannedText = "OM-MEEPLE-m-1";
    const onPick = vi.fn();
    render(
      <HoldingTargetPicker targets={MEEPLES} value={null} onPick={onPick} />,
    );

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(onPick).toHaveBeenCalledWith("m-1", "meeple-qr");
  });

  it("shows a hint instead of picking when the scan matches nothing", () => {
    nextScannedText = "Demo";
    const onPick = vi.fn();
    render(
      <HoldingTargetPicker targets={MEEPLES} value={null} onPick={onPick} />,
    );

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByText("Kein passendes Ziel erkannt.")).toBeVisible();
  });
});
