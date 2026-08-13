import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const findStorageUnitByCodeMock = vi.fn();
const createStorageUnitMock = vi.fn();
vi.mock("@/lib/ludothek/storage-units", () => ({
  findStorageUnitByCode: (...args: unknown[]) =>
    findStorageUnitByCodeMock(...args),
  createStorageUnit: (...args: unknown[]) => createStorageUnitMock(...args),
}));

vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned("OM-BOX-0001")}>
      simulate-scan
    </button>
  ),
}));

const { CreateBoardGameLocationField } = await import(
  "./create-board-game-location-field"
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CreateBoardGameLocationField", () => {
  it("resolves a matching unit and reports its placement", async () => {
    findStorageUnitByCodeMock.mockResolvedValue({
      id: "unit-1",
      label: "Karton 1",
      code: "OM-BOX-0001",
    });
    const onResolved = vi.fn();
    render(<CreateBoardGameLocationField onResolved={onResolved} />);

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(await screen.findByText("Standort: Karton 1")).toBeInTheDocument();
    expect(onResolved).toHaveBeenCalledWith({ unitId: "unit-1" });
  });

  it("offers to create and self-assign a unit when the code has no match", async () => {
    findStorageUnitByCodeMock.mockResolvedValue(null);
    const onResolved = vi.fn();
    render(<CreateBoardGameLocationField onResolved={onResolved} />);

    fireEvent.click(screen.getByText("simulate-scan"));

    expect(
      await screen.findByText(
        "Keine Aufbewahrungseinheit mit diesem Code gefunden.",
      ),
    ).toBeInTheDocument();
    expect(onResolved).toHaveBeenCalledWith(null);

    createStorageUnitMock.mockResolvedValue({
      success: true,
      id: "unit-new",
      code: "OM-BOX-0001",
    });
    fireEvent.click(
      screen.getByText("Aufbewahrungseinheit neu anlegen und mir zuweisen"),
    );

    expect(await screen.findByText(/Standort: OM-BOX-0001/)).toBeInTheDocument();
    expect(createStorageUnitMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: "OM-BOX-0001", keeperMeepleId: "self" }),
    );
    expect(onResolved).toHaveBeenCalledWith({ unitId: "unit-new" });
  });

  it("places the copy with the creator via 'Mir zuweisen', no unit involved", () => {
    const onResolved = vi.fn();
    render(<CreateBoardGameLocationField onResolved={onResolved} />);

    fireEvent.click(screen.getByRole("button", { name: "Mir zuweisen" }));

    expect(screen.getByText("Standort: bei dir")).toBeInTheDocument();
    expect(onResolved).toHaveBeenCalledWith({ self: true });
    expect(findStorageUnitByCodeMock).not.toHaveBeenCalled();
  });
});
