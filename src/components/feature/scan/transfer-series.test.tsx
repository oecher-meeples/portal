import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ScanModeHandle } from "./use-scan-series";

const resolveMock = vi.fn();
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanResolveCode: (raw: string) => resolveMock(raw),
  scanListUnits: async () => [
    { id: "unit-k1", code: "OM-BOX-0001", label: "Kiste 1" },
  ],
  scanListMeeples: async () => [{ id: "meeple-b", displayName: "Bea" }],
  scanEinlagernUnit: vi.fn(),
}));
const transferMock = vi.fn();
const validateMock = vi.fn();
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanTransferGame: (...args: unknown[]) => transferMock(...args),
  scanValidateTarget: (id: string) => validateMock(id),
  scanPickCopy: vi.fn(),
}));
// Comboboxen als schlichte Buttons: wählt die erste Option.
vi.mock("@/components/entities/meeple-combobox", () => ({
  MeepleCombobox: (props: {
    options: { id: string }[];
    onValueChange: (id: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => props.onValueChange(props.options[0].id)}
    >
      Person wählen
    </button>
  ),
}));
vi.mock("@/components/ui/id-combobox", () => ({
  IdCombobox: (props: {
    options: { id: string }[];
    onValueChange: (id: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => props.onValueChange(props.options[0].id)}
    >
      Einheit wählen
    </button>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { TransferSeries } = await import("./transfer-series");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const GAME = {
  id: "copy-1",
  inventoryNumber: 4,
  condition: null,
  needsCompletenessCheck: false,
  boardGame: { title: "Azul", slug: "azul" },
};
const BEA_QR = {
  kind: "meeple",
  meeple: { id: "meeple-b", displayName: "Bea" },
};

function setup() {
  const ref = createRef<ScanModeHandle>();
  render(<TransferSeries ref={ref} />);
  return (raw: string) => act(() => ref.current!.handleCode(raw));
}

function transferred(outcome: string, confirmed: boolean) {
  return { success: true, value: { outcome, confirmed } };
}

const press = (name: string) =>
  act(async () => screen.getByRole("button", { name }).click());

describe("TransferSeries — Zielphase (#539)", () => {
  it("asks for the target first when a game comes first", async () => {
    const scan = setup();
    resolveMock.mockResolvedValueOnce({ kind: "games", games: [GAME] });

    await scan("inv-4");

    expect(
      screen.getByText("Erst Ziel scannen oder wählen."),
    ).toBeInTheDocument();
    expect(transferMock).not.toHaveBeenCalled();
  });

  it("takes a scanned personal QR as confirmed target", async () => {
    const scan = setup();
    resolveMock
      .mockResolvedValueOnce(BEA_QR)
      .mockResolvedValueOnce({ kind: "games", games: [GAME] });
    validateMock.mockResolvedValue({ success: true });
    transferMock.mockResolvedValue(transferred("handover", true));

    await scan("meeple-b");
    await scan("inv-4");

    expect(validateMock).toHaveBeenCalledWith("meeple-b");
    expect(transferMock).toHaveBeenCalledWith("copy-1", {
      kind: "meeple",
      meepleId: "meeple-b",
      intent: "handover",
      viaTargetQrScan: true,
    });
    expect(
      screen.getByText("Azul (Inv.-Nr. 4): weitergegeben → Bea — bestätigt"),
    ).toBeInTheDocument();
  });

  it.each([
    "Ziel ungültig — an dich selbst kannst du nicht übergeben.",
    "Ziel ungültig — Diese Person ist ausgetreten und kann keine Spiele mehr annehmen.",
  ])("rejects an invalid target immediately: %s", async (message) => {
    const scan = setup();
    resolveMock.mockResolvedValueOnce(BEA_QR);
    validateMock.mockResolvedValue({ error: message });

    await scan("meeple-b");

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/^Ziel:/)).not.toBeInTheDocument();
  });

  it("books a manually chosen person unconfirmed and switches to Zurückgeben", async () => {
    const scan = setup();
    validateMock.mockResolvedValue({ success: true });
    transferMock.mockResolvedValue(transferred("return-to-person", false));
    resolveMock.mockResolvedValue({ kind: "games", games: [GAME] });

    await press("Ziel manuell wählen");
    await press("Person wählen");
    await press("Zurückgeben");
    await scan("inv-4");

    expect(transferMock).toHaveBeenCalledWith("copy-1", {
      kind: "meeple",
      meepleId: "meeple-b",
      intent: "return",
      viaTargetQrScan: false,
    });
    expect(
      screen.getByText(
        "Azul (Inv.-Nr. 4): zurückgegeben → Bea — unbestätigt, wartet auf Bea",
      ),
    ).toBeInTheDocument();
  });

  it("offers a manual unit target and only shows the toggle for persons", async () => {
    setup();

    await press("Ziel manuell wählen");
    await press("Einheit wählen");

    expect(screen.getByText("Kiste 1 (OM-BOX-0001)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Zurückgeben" }),
    ).not.toBeInTheDocument();
  });

  it("asks before switching from a person to a scanned unit", async () => {
    const scan = setup();
    resolveMock.mockResolvedValueOnce(BEA_QR).mockResolvedValueOnce({
      kind: "unit",
      unit: { id: "unit-k1", code: "OM-BOX-0001", label: "Kiste 1" },
      contents: [],
    });
    validateMock.mockResolvedValue({ success: true });

    await scan("meeple-b");
    await scan("OM-BOX-0001");

    expect(
      screen.getByRole("button", { name: "Ziel wechseln" }),
    ).toBeInTheDocument();
    // Einlagern gibt es nur bei Einheit in Einheit.
    expect(
      screen.queryByRole("button", { name: /einlagern/ }),
    ).not.toBeInTheDocument();

    await press("Abbrechen");
    expect(screen.getByText("Bea")).toBeInTheDocument();
  });
});
