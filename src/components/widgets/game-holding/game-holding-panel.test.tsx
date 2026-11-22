import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

let nextScannedText = "";
vi.mock("@/components/ui/scan-search-dialog", () => ({
  ScanSearchDialog: ({ onScanned }: { onScanned: (text: string) => void }) => (
    <button type="button" onClick={() => onScanned(nextScannedText)}>
      simulate-scan
    </button>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const scanGiveToMeepleMock = vi.fn().mockResolvedValue({ success: true });
const scanTransferGameMock = vi.fn();
const scanHandOverToExternalMock = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanGetGameContext: async () => ({
    game: { id: "copy-1", title: "Ark Nova", inventoryNumber: 189 },
    holding: {
      id: "h-1",
      vereinsmitgliedId: "me",
      vereinsmitgliedName: "Ich",
      confirmedAt: new Date(),
      verfuegbar: true,
      origin: "BORROW",
      unitId: null,
    },
    isSelf: true,
  }),
  scanListMeeples: async () => [{ id: "m-2", displayName: "Maria Demo" }],
  scanListUnits: async () => [
    { id: "unit-1", code: "OM-BOX-0001", label: "Kiste A" },
  ],
  scanGiveToMeeple: (...args: unknown[]) => scanGiveToMeepleMock(...args),
  scanReturnToMeeple: vi.fn(),
  scanAcceptHandover: vi.fn(),
  scanAcceptReturn: vi.fn(),
  scanBorrowGame: vi.fn(),
  scanConfirmHolding: vi.fn(),
  confirmHoldingForGamesManager: vi.fn(),
}));
vi.mock("@/lib/ludothek/holding-actions-external", () => ({
  scanConfirmExternalReturn: vi.fn(),
  scanHandOverToExternal: (...args: unknown[]) =>
    scanHandOverToExternalMock(...args),
  scanLendToExternalMember: vi.fn(),
  scanListMembers: async () => [],
  scanRebookToMember: vi.fn(),
}));
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanTransferGame: (...args: unknown[]) => scanTransferGameMock(...args),
}));

const { GameHoldingPanel } = await import("./game-holding-panel");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GameHoldingPanel — Ziel-Scan löst sofort aus (#573)", () => {
  it("hands the game over as soon as the target's QR code is scanned", async () => {
    nextScannedText = "OM-MEEPLE-m-2";
    render(<GameHoldingPanel gameCopyId="copy-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Weitergeben" }));
    await screen.findByText("Weitergeben an");
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("simulate-scan"));

    await waitFor(() =>
      expect(scanGiveToMeepleMock).toHaveBeenCalledWith("copy-1", "m-2", true),
    );
  });

  it("opens the unit field only via the Einlagern button and books on scan", async () => {
    nextScannedText = "https://short.oecher-meeples.org/id/box-0001";
    scanTransferGameMock.mockResolvedValue({
      success: true,
      value: { outcome: "already-there" },
    });
    render(<GameHoldingPanel gameCopyId="copy-1" />);

    await screen.findByRole("button", { name: "Einlagern" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Einlagern" }));
    await screen.findByText("Einlagern in");
    // Einheiten laden asynchron — erst danach matcht der Scan.
    await waitFor(() => {
      fireEvent.click(screen.getByText("simulate-scan"));
      expect(scanTransferGameMock).toHaveBeenCalledWith("copy-1", {
        kind: "unit",
        unitId: "unit-1",
      });
    });
    expect(
      await screen.findByText("Liegt schon in OM-BOX-0001."),
    ).toBeInTheDocument();
  });

  it("submits the external name on Enter, without a scan button", async () => {
    render(<GameHoldingPanel gameCopyId="copy-1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "An extern weitergegeben" }),
    );
    expect(screen.queryByText("simulate-scan")).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText("Vor- und Nachname");
    fireEvent.change(input, { target: { value: "Erika Extern" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(scanHandOverToExternalMock).toHaveBeenCalledWith(
        "copy-1",
        "Erika Extern",
      ),
    );
  });
});
