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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/lib/ludothek/game-copies", () => ({
  requestCompletenessCheck: vi.fn(),
  markUnitForCompletenessCheck: vi.fn(),
}));

const scanResolveCodeMock = vi.fn();
const scanEinlagernUnitMock = vi.fn();
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanResolveCode: (raw: string) => scanResolveCodeMock(raw),
  scanListUnits: async () => [UNIT_A, UNIT_B],
  scanListMeeples: async () => [],
  scanEinlagernUnit: (...args: unknown[]) => scanEinlagernUnitMock(...args),
}));
const scanTransferGameMock = vi.fn();
const scanReceiveGameMock = vi.fn();
const scanPickCopyMock = vi.fn();
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanTransferGame: (gameCopyId: string, target: { unitId: string }) =>
    scanTransferGameMock(gameCopyId, target),
  scanReceiveGame: (gameCopyId: string) => scanReceiveGameMock(gameCopyId),
  scanPickCopy: (...args: unknown[]) => scanPickCopyMock(...args),
  scanValidateTarget: vi.fn(),
}));

function placed(outcome: string) {
  return {
    success: true,
    value: { outcome, confirmed: true, title: "Catan", inventoryNumber: null },
  };
}

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
  boardGame: { title: "Catan", slug: "catan" },
  needsCompletenessCheck: false,
};
const GAME_2 = {
  id: "copy-2",
  condition: "leicht bespielt",
  boardGame: { title: "Catan", slug: "catan" },
  needsCompletenessCheck: false,
};

const TARGET_CHIP = (code: string) => (_: string, node: Element | null) =>
  node?.tagName === "SPAN" &&
  Boolean(
    node.textContent?.startsWith("Ziel:") && node.textContent.includes(code),
  );

/** „Kiste füllen" über den Button an der Einheit (#539, löst die frühere
 * Einlagern-Serie ab). */
async function fillUnitA() {
  render(<ScanView canManageGames={false} initialMode="einzel" />);
  fireEvent.click(await enterEinlagernMode(UNIT_A));
  expect(window.location.search).toBe("?modus=uebergeben&ziel=unit-a");
  expect(await screen.findByText(TARGET_CHIP(UNIT_A.code))).toBeInTheDocument();
}

describe("ScanView — Einlagern-Serie geht in Übergeben auf (#539)", () => {
  it("fills a box: every scanned game goes into the target unit", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1],
    });
    scanTransferGameMock.mockResolvedValue(placed("return-to-unit"));

    scan("4001504311892");

    expect(
      await screen.findByText("Catan: zurückgelegt → Kiste A (OM-BOX-0001)"),
    ).toBeInTheDocument();
    expect(scanTransferGameMock).toHaveBeenCalledWith("copy-1", {
      kind: "unit",
      unitId: "unit-a",
    });
  });

  it("asks for the copy of an ambiguous EAN instead of placing every copy", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1, GAME_2],
    });
    scanPickCopyMock.mockResolvedValueOnce(null);
    scanTransferGameMock.mockResolvedValue(placed("relocate"));

    scan("4001504311892");
    fireEvent.click(await screen.findByText("Catan (leicht bespielt)"));

    expect(
      await screen.findByText(
        "Catan (leicht bespielt): umgelagert → Kiste A (OM-BOX-0001)",
      ),
    ).toBeInTheDocument();
    expect(scanTransferGameMock).toHaveBeenCalledTimes(1);
    expect(scanTransferGameMock).toHaveBeenCalledWith("copy-2", {
      kind: "unit",
      unitId: "unit-a",
    });
  });

  it("puts a box into the target box after asking (Kiste in Kiste)", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_B,
      contents: [],
    });
    scanEinlagernUnitMock.mockResolvedValue({ success: true });

    scan(UNIT_B.code);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "OM-BOX-0002 in OM-BOX-0001 einlagern",
      }),
    );

    expect(scanEinlagernUnitMock).toHaveBeenCalledWith("unit-b", {
      parentUnitId: "unit-a",
    });
    expect(
      await screen.findByText(
        "Einheit Kiste B (OM-BOX-0002) → Kiste A (OM-BOX-0001) eingelagert",
      ),
    ).toBeInTheDocument();
  });

  it("switches the target box only after asking", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_B,
      contents: [],
    });

    scan(UNIT_B.code);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ziel wechseln" }),
    );

    expect(
      await screen.findByText(TARGET_CHIP(UNIT_B.code)),
    ).toBeInTheDocument();
    expect(scanEinlagernUnitMock).not.toHaveBeenCalled();
  });

  it("only hints when the target box itself is scanned again", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT_A,
      contents: [],
    });

    scan(UNIT_A.code);

    expect(
      await screen.findByText("Das ist bereits das Ziel."),
    ).toBeInTheDocument();
  });

  it("logs a hint when the game already lies in the target box", async () => {
    await fillUnitA();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [GAME_1],
    });
    scanTransferGameMock.mockResolvedValue(placed("already-there"));

    scan("4001504311892");

    expect(
      await screen.findByText("Catan: liegt schon dort"),
    ).toBeInTheDocument();
  });
});

describe("ScanView — unbekannter EAN (Regression)", () => {
  it("shows the existing 'not in stock' message", async () => {
    render(<ScanView canManageGames={false} initialMode="einzel" />);

    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unknown",
      raw: "0000000000000",
    });
    scan("0000000000000");

    expect(await screen.findByText("Nicht im Bestand")).toBeInTheDocument();
  });
});

describe("ScanView — Moduswahl (#538)", () => {
  const modeLabels = () =>
    screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((label) =>
        [
          "Erhalten",
          "Übergeben",
          "Einzel-Scan",
          "Kontrolle anfordern",
          "Kontrollieren",
        ].includes(label ?? ""),
      );

  it("offers the Kontroll-Modi only with games:manage", () => {
    render(<ScanView canManageGames={false} initialMode="einzel" />);
    expect(modeLabels()).toEqual(["Einzel-Scan", "Erhalten", "Übergeben"]);
    cleanup();

    render(<ScanView canManageGames initialMode="einzel" />);
    expect(modeLabels()).toEqual([
      "Einzel-Scan",
      "Erhalten",
      "Übergeben",
      "Kontrollieren",
      "Kontrolle anfordern",
    ]);
  });

  it("starts in the mode from the URL and writes a mode change back", () => {
    window.history.replaceState(null, "", "/scan?modus=erhalten");
    render(<ScanView canManageGames={false} initialMode="erhalten" />);
    expect(screen.getByText("0 Spiele erhalten")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Einzel-Scan" }));

    expect(window.location.search).toBe("");
    expect(screen.getByText("Noch nichts gescannt.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Erhalten" }));
    expect(window.location.search).toBe("?modus=erhalten");
  });

  it("routes scans to the active mode", async () => {
    render(<ScanView canManageGames={false} initialMode="erhalten" />);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [{ ...GAME_1, inventoryNumber: 7 }],
    });
    scanReceiveGameMock.mockResolvedValue({
      success: true,
      value: {
        gameCopyId: "copy-1",
        outcome: "borrow",
        confirmed: true,
        title: "Catan",
        inventoryNumber: 7,
        boardGameSlug: "catan",
      },
    });

    scan("inv-7");

    expect(
      await screen.findByText("Catan (Inv.-Nr. 7): ausgeliehen"),
    ).toBeInTheDocument();
    expect(scanReceiveGameMock).toHaveBeenCalledWith("copy-1");
  });
});
