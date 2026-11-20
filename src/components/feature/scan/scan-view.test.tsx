import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("@/components/ui/code-scanner", () => ({
  CodeScanner: () => null,
}));
vi.mock("@/components/widgets/game-holding/game-holding-panel", () => ({
  GameHoldingPanel: ({ gameCopyId }: { gameCopyId: string }) => (
    <div>game-panel-{gameCopyId}</div>
  ),
}));
vi.mock("@/components/feature/scan/pruefbogen-panel", () => ({
  PruefbogenPanel: () => null,
}));

const scanResolveCodeMock = vi.fn();
const scanTransferGameMock = vi.fn();
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanResolveCode: (raw: string) => scanResolveCodeMock(raw),
}));
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanTransferGame: (gameCopyId: string, target: { unitId: string }) =>
    scanTransferGameMock(gameCopyId, target),
}));

const PLACED = { success: true, value: { outcome: "return-to-unit" } };

const { ScanView } = await import("./scan-view");

function scan(raw: string) {
  fireEvent.change(screen.getByLabelText("Manuelle Eingabe"), {
    target: { value: raw },
  });
  fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
}

function enterEinlagernMode(unit: { id: string; code: string; label: string }) {
  scanResolveCodeMock.mockResolvedValueOnce({
    kind: "unit",
    unit,
    contents: [],
  });
  scan(unit.code);
  return screen.findByRole("button", {
    name: `Serienmodus: Einlagern in ${unit.code}`,
  });
}

const UNIT_A = { id: "unit-a", code: "OM-BOX-0001", label: "Kiste A" };
const UNIT_B = { id: "unit-b", code: "OM-BOX-0002", label: "Kiste B" };

const GAME_1 = {
  id: "copy-1",
  condition: null,
  boardGame: { title: "Catan" },
};
const GAME_2 = {
  id: "copy-2",
  condition: "leicht bespielt",
  boardGame: { title: "Catan" },
};

describe("ScanView — Serienmodus Einlagern, Mehrfachtreffer (#5)", () => {
  it("opens the same selection dialog as the regular flow instead of placing every copy", async () => {
    render(<ScanView canManageGames={false} />);
    const enterButton = await enterEinlagernMode(UNIT_A);
    fireEvent.click(enterButton);

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1, GAME_2],
    });
    scan("4001504311892");

    expect(
      await screen.findByText("Mehrere Spiele mit dieser EAN — welches?"),
    ).toBeInTheDocument();
    expect(scanTransferGameMock).not.toHaveBeenCalled();

    scanTransferGameMock.mockResolvedValue(PLACED);
    fireEvent.click(screen.getByText("Catan (leicht bespielt)"));

    expect(scanTransferGameMock).toHaveBeenCalledWith("copy-2", {
      kind: "unit",
      unitId: "unit-a",
    });
    expect(
      await screen.findByText("Catan (leicht bespielt) → OM-BOX-0001"),
    ).toBeInTheDocument();
  });
});

describe("ScanView — Serienmodus Einlagern, Kistenwechsel (#5)", () => {
  async function placeOneGameInUnitA() {
    render(<ScanView canManageGames={false} />);
    const enterButton = await enterEinlagernMode(UNIT_A);
    fireEvent.click(enterButton);

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1],
    });
    scanTransferGameMock.mockResolvedValue(PLACED);
    scan("4001504311892");
    await screen.findByText("Catan → OM-BOX-0001");
  }

  it("asks for confirmation and relocates on 'Ja'", async () => {
    await placeOneGameInUnitA();

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_B,
      contents: [],
    });
    scan(UNIT_B.code);

    expect(
      await screen.findByText(
        (_, node) =>
          node?.textContent ===
          "Letztes Spiel Catan neu zuordnen zu Kiste OM-BOX-0002?",
      ),
    ).toBeInTheDocument();

    scanTransferGameMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Ja, umbuchen" }));

    expect(scanTransferGameMock).toHaveBeenCalledWith("copy-1", {
      kind: "unit",
      unitId: "unit-b",
    });
    expect(
      await screen.findByText(
        (_, node) =>
          node?.tagName === "P" &&
          Boolean(
            node.textContent?.startsWith(
              "Alles was jetzt gescannt wird, wird eingelagert in",
            ) && node.textContent?.includes(UNIT_B.code),
          ),
      ),
    ).toBeInTheDocument();
  });

  it("keeps the assignment but switches the active box on 'Nein'", async () => {
    await placeOneGameInUnitA();

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_B,
      contents: [],
    });
    scan(UNIT_B.code);
    await screen.findByRole("button", { name: "Nein" });

    scanTransferGameMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Nein" }));

    expect(scanTransferGameMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        (_, node) =>
          node?.tagName === "P" &&
          Boolean(
            node.textContent?.startsWith(
              "Alles was jetzt gescannt wird, wird eingelagert in",
            ) && node.textContent?.includes(UNIT_B.code),
          ),
      ),
    ).toBeInTheDocument();
  });

  it("keeps the existing self-relocation message when the same box is scanned again", async () => {
    await placeOneGameInUnitA();

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_A,
      contents: [],
    });
    scan(UNIT_A.code);

    expect(
      await screen.findByText(
        "Einheit OM-BOX-0001 kann nicht in sich selbst eingelagert werden.",
      ),
    ).toBeInTheDocument();
  });
});

describe("ScanView — Serienmodus Einlagern, liegt schon dort (#537)", () => {
  it("logs a hint instead of a booking", async () => {
    render(<ScanView canManageGames={false} />);
    fireEvent.click(await enterEinlagernMode(UNIT_A));

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1],
    });
    scanTransferGameMock.mockResolvedValue({
      success: true,
      value: { outcome: "already-there" },
    });
    scan("4001504311892");

    expect(
      await screen.findByText("Catan liegt schon in OM-BOX-0001"),
    ).toBeInTheDocument();
  });
});

describe("ScanView — unbekannter EAN (Regression)", () => {
  it("shows the existing 'not in stock' message", async () => {
    render(<ScanView canManageGames={false} />);

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unknown",
      raw: "0000000000000",
    });
    scan("0000000000000");

    expect(await screen.findByText("Nicht im Bestand")).toBeInTheDocument();
  });
});
