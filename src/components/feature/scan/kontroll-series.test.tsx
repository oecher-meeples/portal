import "@testing-library/jest-dom/vitest";
import { createRef, type ComponentType, type Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ScanModeHandle } from "./use-scan-series";

const scanResolveCodeMock = vi.fn();
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanResolveCode: (raw: string) => scanResolveCodeMock(raw),
}));
const scanPickCopyMock = vi.fn();
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanPickCopy: (...args: unknown[]) => scanPickCopyMock(...args),
}));
const requestCompletenessCheckMock = vi.fn();
const markUnitMock = vi.fn();
vi.mock("@/lib/ludothek/game-copies", () => ({
  requestCompletenessCheck: (id: string) => requestCompletenessCheckMock(id),
  markUnitForCompletenessCheck: (id: string) => markUnitMock(id),
}));
vi.mock("@/components/feature/scan/pruefbogen-panel", () => ({
  PruefbogenPanel: ({
    title,
    onDone,
  }: {
    title: string;
    onDone: () => void;
  }) => (
    <button type="button" onClick={onDone}>
      prüfbogen-{title}
    </button>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { MarkSeries } = await import("./mark-series");
const { CheckSeries } = await import("./check-series");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function copy(id: string, title: string, marked: boolean) {
  return {
    id,
    inventoryNumber: Number(id.replace(/\D/g, "")) || null,
    condition: null,
    needsCompletenessCheck: marked,
    boardGame: { title, slug: title.toLowerCase() },
  };
}

const UNIT = { id: "unit-1", code: "OM-BOX-0001", label: "Kiste A" };

function renderMode(Mode: ComponentType<{ ref: Ref<ScanModeHandle> }>) {
  const ref = createRef<ScanModeHandle>();
  render(<Mode ref={ref} />);
  return (raw: string) => act(() => ref.current!.handleCode(raw));
}

const click = (name: string) =>
  act(async () => screen.getByRole("button", { name }).click());

describe("MarkSeries — Kontrolle anfordern (#563)", () => {
  it("marks a single game", async () => {
    const scan = renderMode(MarkSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("c1", "Catan", false)],
    });
    requestCompletenessCheckMock.mockResolvedValueOnce({
      success: true,
      alreadyMarked: false,
    });

    await scan("inv-1");

    expect(requestCompletenessCheckMock).toHaveBeenCalledWith("c1");
    expect(
      screen.getByText("Catan (Inv.-Nr. 1): zur Kontrolle markiert"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 Spiel markiert")).toBeInTheDocument();
  });

  it("only hints at an already marked game, without error", async () => {
    const scan = renderMode(MarkSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("c1", "Catan", true)],
    });
    requestCompletenessCheckMock.mockResolvedValueOnce({
      success: true,
      alreadyMarked: true,
    });

    await scan("inv-1");

    expect(
      screen.getByText("Catan (Inv.-Nr. 1): bereits markiert"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 Spiele markiert")).toBeInTheDocument();
  });

  it("asks before marking all direct contents of a unit", async () => {
    const scan = renderMode(MarkSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT,
      contents: [1, 2, 3, 4, 5].map((n) => copy(`c${n}`, "Spiel", false)),
    });
    markUnitMock.mockResolvedValueOnce({ success: true, count: 5 });

    await scan(UNIT.code);
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" &&
          Boolean(node.textContent?.startsWith("Alle 5 Spiele in Kiste A")),
      ),
    ).toBeInTheDocument();
    expect(markUnitMock).not.toHaveBeenCalled();

    await click("Alle markieren");

    expect(markUnitMock).toHaveBeenCalledWith("unit-1");
    expect(screen.getByText("Kiste A: 5 Spiele markiert")).toBeInTheDocument();
    expect(screen.getByText("5 Spiele markiert")).toBeInTheDocument();
  });

  it("marks nothing when the unit prompt is cancelled", async () => {
    const scan = renderMode(MarkSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT,
      contents: [],
    });

    await scan(UNIT.code);
    await click("Abbrechen");

    expect(markUnitMock).not.toHaveBeenCalled();
  });
});

describe("CheckSeries — Kontrollieren (#563)", () => {
  it("opens the Prüfbogen for a marked game and continues after saving", async () => {
    const scan = renderMode(CheckSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("c1", "Catan", true)],
    });

    await scan("inv-1");
    expect(
      screen.queryByText("War nicht zur Kontrolle markiert."),
    ).not.toBeInTheDocument();

    await click("prüfbogen-Catan");

    expect(
      screen.getByText("Catan (Inv.-Nr. 1): Prüfbogen gespeichert"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 Spiel kontrolliert")).toBeInTheDocument();
  });

  it("opens the Prüfbogen for an unmarked game with a hint", async () => {
    const scan = renderMode(CheckSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("c1", "Catan", false)],
    });

    await scan("inv-1");

    expect(
      screen.getByText("War nicht zur Kontrolle markiert."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "prüfbogen-Catan" }),
    ).toBeInTheDocument();
  });

  it("ignores further scans while a Prüfbogen is open", async () => {
    const scan = renderMode(CheckSeries);
    scanResolveCodeMock.mockResolvedValue({
      kind: "games",
      games: [copy("c1", "Catan", true)],
    });

    await scan("inv-1");
    await scan("inv-2");

    expect(scanResolveCodeMock).toHaveBeenCalledTimes(1);
  });

  it("lists the marked games of a scanned unit and opens one", async () => {
    const scan = renderMode(CheckSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "unit",
      unit: UNIT,
      contents: [
        copy("c1", "Catan", true),
        copy("c2", "Azul", false),
        copy("c3", "Ark", true),
      ],
    });

    await scan(UNIT.code);
    expect(
      screen.getByText("Kiste A: 2 von 3 zur Kontrolle"),
    ).toBeInTheDocument();

    await click("Ark · Inv.-Nr. 3");
    await click("prüfbogen-Ark");

    expect(
      screen.getByText("Kiste A: 1 von 3 zur Kontrolle"),
    ).toBeInTheDocument();
  });

  it("pre-selects the marked copy of an ambiguous EAN", async () => {
    const scan = renderMode(CheckSeries);
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("c1", "Catan", false), copy("c2", "Catan", true)],
    });
    scanPickCopyMock.mockResolvedValueOnce("c2");

    await scan("4001504311892");

    expect(scanPickCopyMock).toHaveBeenCalledWith(["c1", "c2"], "check", null);
    expect(
      screen.getByRole("button", { name: "prüfbogen-Catan" }),
    ).toBeInTheDocument();
  });
});
