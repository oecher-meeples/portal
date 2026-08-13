import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const scanBorrowGameMock = vi.fn().mockResolvedValue({ success: true });
const scanAcceptReturnMock = vi.fn().mockResolvedValue({ success: true });
const scanGiveToMeepleMock = vi.fn().mockResolvedValue({ success: true });
const scanRelocateGameMock = vi.fn().mockResolvedValue({ success: true });
const scanReturnToMeepleMock = vi.fn().mockResolvedValue({ success: true });
const scanListMeeplesMock = vi.fn().mockResolvedValue([
  { id: "meeple-1", displayName: "Lea Demo" },
  { id: "meeple-2", displayName: "Max Demo" },
]);
const scanListUnitsMock = vi.fn().mockResolvedValue([
  { id: "unit-1", code: "OM-BOX-0001", label: "Karton 1" },
  { id: "unit-2", code: "OM-SHELF-0002", label: "Regal 2" },
]);

vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanBorrowGame: (...args: unknown[]) => scanBorrowGameMock(...args),
  scanAcceptReturn: (...args: unknown[]) => scanAcceptReturnMock(...args),
  scanGiveToMeeple: (...args: unknown[]) => scanGiveToMeepleMock(...args),
  scanRelocateGame: (...args: unknown[]) => scanRelocateGameMock(...args),
  scanReturnToMeeple: (...args: unknown[]) => scanReturnToMeepleMock(...args),
  scanListMeeples: () => scanListMeeplesMock(),
  scanListUnits: () => scanListUnitsMock(),
}));

let nextScannedText = "";
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned(nextScannedText)}>
      simulate-scan
    </button>
  ),
}));

const {
  BorrowGameDialog,
  AcceptReturnDialog,
  GiveToMeepleDialog,
  RelocateGameDialog,
} = await import("./holding-mini-dialogs");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BorrowGameDialog", () => {
  it("calls scanBorrowGame on submit", async () => {
    render(<BorrowGameDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Ausleihen" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Ausleihen" }));

    expect(scanBorrowGameMock).toHaveBeenCalledWith("copy-1");
  });
});

describe("AcceptReturnDialog", () => {
  it("calls scanAcceptReturn on submit for the default 'an mich' mode", async () => {
    render(<AcceptReturnDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rückgabe" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Annehmen" }));

    expect(scanAcceptReturnMock).toHaveBeenCalledWith("copy-1");
  });

  it("submits the manually selected person via scanReturnToMeeple", async () => {
    render(<AcceptReturnDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rückgabe" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "An Person" }));
    fireEvent.change(await within(dialog).findByRole("combobox"), {
      target: { value: "meeple-2" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "An Person übergeben" }),
    );

    expect(scanReturnToMeepleMock).toHaveBeenCalledWith("copy-1", "meeple-2");
  });

  it("resolves a simulated scan against the meeple list and submits the match", async () => {
    nextScannedText = "Max Demo";
    render(<AcceptReturnDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rückgabe" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "An Person" }));
    await within(dialog).findByRole("combobox");
    fireEvent.click(within(dialog).getByText("simulate-scan"));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "An Person übergeben" }),
    );

    expect(scanReturnToMeepleMock).toHaveBeenCalledWith("copy-1", "meeple-2");
  });
});

describe("GiveToMeepleDialog", () => {
  it("submits the manually selected meeple", async () => {
    render(<GiveToMeepleDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Weitergeben" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "meeple-2" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Weitergeben" }),
    );

    expect(scanGiveToMeepleMock).toHaveBeenCalledWith("copy-1", "meeple-2");
  });

  it("resolves a simulated scan against the meeple list and submits the match", async () => {
    nextScannedText = "Max Demo";
    render(<GiveToMeepleDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Weitergeben" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("combobox");
    fireEvent.click(within(dialog).getByText("simulate-scan"));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Weitergeben" }),
    );

    expect(scanGiveToMeepleMock).toHaveBeenCalledWith("copy-1", "meeple-2");
  });
});

describe("RelocateGameDialog", () => {
  it("submits the manually selected unit", async () => {
    render(<RelocateGameDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Umlagern" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "unit-2" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Umlagern" }));

    expect(scanRelocateGameMock).toHaveBeenCalledWith("copy-1", "unit-2");
  });

  it("resolves a simulated scan against the unit code and submits the match", async () => {
    nextScannedText = "OM-BOX-0001";
    render(<RelocateGameDialog gameCopyId="copy-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Umlagern" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByRole("combobox");
    fireEvent.click(within(dialog).getByText("simulate-scan"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Umlagern" }));

    expect(scanRelocateGameMock).toHaveBeenCalledWith("copy-1", "unit-1");
  });
});
