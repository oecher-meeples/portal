import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ScanModeHandle } from "./use-scan-series";

const scanResolveCodeMock = vi.fn();
vi.mock("@/lib/ludothek/holding-actions", () => ({
  scanResolveCode: (raw: string) => scanResolveCodeMock(raw),
}));
const scanReceiveGameMock = vi.fn();
const scanPickCopyMock = vi.fn();
vi.mock("@/lib/ludothek/scanner-actions", () => ({
  scanReceiveGame: (id: string) => scanReceiveGameMock(id),
  scanPickCopy: (...args: unknown[]) => scanPickCopyMock(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { ReceiveSeries } = await import("./receive-series");

function copy(
  id: string,
  inventoryNumber: number,
  condition: string | null = null,
) {
  return {
    id,
    inventoryNumber,
    condition,
    needsCompletenessCheck: false,
    boardGame: { title: "Catan", slug: "catan" },
  };
}

function outcome(id: string, inventoryNumber: number, kind = "borrow") {
  return {
    success: true,
    value: {
      gameCopyId: id,
      outcome: kind,
      confirmed: true,
      title: "Catan",
      inventoryNumber,
      boardGameSlug: "catan",
    },
  };
}

function renderSeries() {
  const ref = createRef<ScanModeHandle>();
  render(<ReceiveSeries ref={ref} />);
  return (raw: string) => act(() => ref.current!.handleCode(raw));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("ReceiveSeries (Modus Erhalten, #538)", () => {
  it("logs every booking with a link to the copy and counts them", async () => {
    const scan = renderSeries();
    scanResolveCodeMock
      .mockResolvedValueOnce({ kind: "games", games: [copy("a", 1)] })
      .mockResolvedValueOnce({ kind: "games", games: [copy("b", 2)] });
    scanReceiveGameMock
      .mockResolvedValueOnce(outcome("a", 1))
      .mockResolvedValueOnce(outcome("b", 2, "handover"));

    await scan("inv-1");
    await scan("inv-2");

    expect(
      screen.getByText("Catan (Inv.-Nr. 1): ausgeliehen"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Catan (Inv.-Nr. 2): übernommen"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 Spiele erhalten")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Zum Exemplar →" })[0],
    ).toHaveAttribute("href", "/ludothek/catan/inv-2");
  });

  it("does not count a game that is already mine", async () => {
    const scan = renderSeries();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("a", 1)],
    });
    scanReceiveGameMock.mockResolvedValueOnce(outcome("a", 1, "already-mine"));

    await scan("inv-1");

    expect(
      screen.getByText("Catan (Inv.-Nr. 1): hast du schon"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 Spiele erhalten")).toBeInTheDocument();
  });

  it("only hints at a unit or Meeple scan, without booking", async () => {
    const scan = renderSeries();
    scanResolveCodeMock
      .mockResolvedValueOnce({ kind: "unit", unit: { id: "u" }, contents: [] })
      .mockResolvedValueOnce({ kind: "meeple", meeple: { id: "m" } });

    await scan("OM-BOX-0001");
    await scan("meeple-1");

    expect(
      screen.getAllByText("Im Modus Erhalten nur Spiele scannen."),
    ).toHaveLength(2);
    expect(scanReceiveGameMock).not.toHaveBeenCalled();
  });

  it("logs a booking error with the game's title", async () => {
    const scan = renderSeries();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("a", 1)],
    });
    scanReceiveGameMock.mockResolvedValueOnce({ error: "Deinventarisiert." });

    await scan("inv-1");

    expect(
      screen.getByText("Catan (Inv.-Nr. 1): Deinventarisiert."),
    ).toBeInTheDocument();
  });

  it("ignores the same code within 3 seconds", async () => {
    const scan = renderSeries();
    scanResolveCodeMock.mockResolvedValue({
      kind: "games",
      games: [copy("a", 1)],
    });
    scanReceiveGameMock.mockResolvedValue(outcome("a", 1, "already-mine"));

    await scan("inv-1");
    await scan("inv-1");
    expect(scanResolveCodeMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3100);
    await scan("inv-1");
    expect(scanResolveCodeMock).toHaveBeenCalledTimes(2);
  });

  it("drops a scan while a booking is still running", async () => {
    const scan = renderSeries();
    let finish: (value: unknown) => void = () => {};
    scanResolveCodeMock.mockResolvedValue({
      kind: "games",
      games: [copy("a", 1)],
    });
    scanReceiveGameMock.mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );

    const first = scan("inv-1");
    await scan("inv-2");
    finish(outcome("a", 1));
    await first;

    expect(scanResolveCodeMock).toHaveBeenCalledTimes(1);
    expect(scanReceiveGameMock).toHaveBeenCalledTimes(1);
  });

  it("books the pre-selected copy of an ambiguous EAN directly", async () => {
    const scan = renderSeries();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("a", 1), copy("b", 2)],
    });
    scanPickCopyMock.mockResolvedValueOnce("b");
    scanReceiveGameMock.mockResolvedValueOnce(outcome("b", 2));

    await scan("4001504311892");

    expect(scanPickCopyMock).toHaveBeenCalledWith(["a", "b"], "receive", null);
    expect(scanReceiveGameMock).toHaveBeenCalledWith("b");
    expect(
      screen.queryByText("Mehrere Spiele mit dieser EAN — welches?"),
    ).not.toBeInTheDocument();
  });

  it("asks for the copy only when the pre-selection stays ambiguous", async () => {
    const scan = renderSeries();
    scanResolveCodeMock.mockResolvedValueOnce({
      kind: "games",
      games: [copy("a", 1), copy("b", 2, "leicht bespielt")],
    });
    scanPickCopyMock.mockResolvedValueOnce(null);
    scanReceiveGameMock.mockResolvedValueOnce(outcome("b", 2));

    await scan("4001504311892");
    expect(
      screen.getByText("Mehrere Spiele mit dieser EAN — welches?"),
    ).toBeInTheDocument();
    expect(scanReceiveGameMock).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByText("Catan (leicht bespielt)").click();
    });

    expect(scanReceiveGameMock).toHaveBeenCalledWith("b");
    expect(
      await screen.findByText(
        "Catan (leicht bespielt) (Inv.-Nr. 2): ausgeliehen",
      ),
    ).toBeInTheDocument();
  });
});
